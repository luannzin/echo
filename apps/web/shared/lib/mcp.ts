import { buildTree } from "@echo/core";
import { categorySchema, folderSchema, type Note, taskSchema } from "@echo/types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { z } from "zod";
import { type EchoRuntime, getEcho } from "@/shared/lib/echo";
import { isDesktopApp } from "@/shared/lib/tauri";

/**
 * Everything echo can do, offered to whatever assistant the reader has chosen.
 *
 * The desktop shell runs an MCP server; this file is the half that knows what a note is. The Rust
 * side holds no domain at all — it forwards a tool name and a JSON object here and sends back
 * whatever comes out, which is the only arrangement that works: every note lives in PGlite inside
 * IndexedDB, so the database can only be reached from the page that opened it.
 *
 * Adding a tool is one entry in `TOOLS` and nothing else. The schema each one advertises is derived
 * from the zod schema beside it, so what a caller is told and what is actually enforced cannot
 * drift apart.
 *
 * These descriptions are in English and deliberately not in `i18n`. They are not words the
 * interface says — they are read by a model, on the other side of a protocol whose own schema is
 * English, and translating them would change what tools mean rather than what a reader sees.
 */

/**
 * What every connecting assistant is told once, before it sees a single tool.
 *
 * MCP calls this the server's instructions, and it is the one place to say what these notes *are*.
 * Everything here is a constraint the tools cannot enforce for themselves.
 */
const INSTRUCTIONS = `echo is a local-first note taker. These notes are one person's own thinking, written in their own words, and they never leave this machine unless you carry them somewhere.

Before writing, search. echo already holds what this person has said, and a second note saying it again is worse than no note at all.

Capture their words, not your summary of them. A note you rewrite into your own register is a note they will not recognise later.

Never create, edit or delete a note the person did not ask for. Deleting is real: there is no server, no backup and no undo. A note must be archived before it can be deleted, so archive it, say so, and delete only if they confirm.

echo learns how this person writes from what they write. Anything you add becomes part of what it learns about them — which is the reason to add little and add it in their voice.`;

/** What the Rust side is told about one tool. Kept flat: it forwards these fields untouched. */
type ToolSpec = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  destructive: boolean;
  idempotent: boolean;
};

type Tool<Schema extends z.ZodType> = {
  description: string;
  input: Schema;
  /** MCP's hints. Advisory to the caller — every refusal that matters is enforced in `run`. */
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  run: (echo: EchoRuntime, input: z.output<Schema>) => Promise<unknown>;
};

const tool = <Schema extends z.ZodType>(definition: Tool<Schema>): Tool<z.ZodType> =>
  definition as unknown as Tool<z.ZodType>;

const nothing = z.object({});
const id = z.uuid();
/** Dates cross the protocol as ISO strings; the domain wants `Date`, and this is the only seam. */
const when = z.iso.datetime().nullable();

/**
 * What a note looks like to a caller that asked for a list. The full text of two hundred notes is
 * not an answer — it is the whole database, and the caller pays for every word of it.
 */
const summarize = (note: Note) => ({
  id: note.id,
  title: note.title,
  excerpt: note.content.slice(0, 240),
  folderId: note.folderId,
  archived: note.archivedAt !== null,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

const full = (note: Note) => ({ ...summarize(note), excerpt: undefined, content: note.content });

/**
 * A note has to be archived before it can be deleted, and a folder has to be empty.
 *
 * Tool annotations are hints and a client may ignore every one of them, so the refusal lives here
 * rather than in what the caller was advised. It costs an assistant one extra call and it means a
 * misread instruction archives something the reader can see and put back, instead of destroying
 * something no copy exists of anywhere.
 */
const mustBeArchived = (note: Note | null): Note => {
  if (!note) throw new Error("There is no note with that id.");
  if (note.archivedAt === null) {
    throw new Error(
      "This note is not archived. Archive it with set_note_archived first, tell the person it is archived, and delete it only if they confirm.",
    );
  }
  return note;
};

const TOOLS: Record<string, Tool<z.ZodType>> = {
  search_notes: tool({
    description:
      "Search the person's notes by meaning and by words together. Use this before writing anything, and to find a note's id.",
    input: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(8),
    }),
    readOnly: true,
    run: async (echo, { query, limit }) => {
      const notes = await echo.notes.list({ limit: 1000 });
      let last: { results: { note: Note; score: number }[] } | undefined;
      // Two passes arrive: words first, then meaning once the model has answered. `search` resolves
      // after the second, so the last pass received is the full one.
      await echo.retrieval.search(query, { notes, affinityOf: () => 0, limit }, (pass) => {
        last = pass;
      });
      return (last?.results ?? []).map(({ note, score }) => ({ ...summarize(note), score }));
    },
  }),

  list_notes: tool({
    description:
      "List notes newest first. Omit folderId for every folder, pass null for the Inbox — the notes that have not been filed.",
    input: z.object({
      folderId: id.nullable().optional(),
      includeArchived: z.boolean().default(false),
      limit: z.number().int().min(1).max(200).default(50),
    }),
    readOnly: true,
    run: async (echo, options) => (await echo.notes.list(options)).map(summarize),
  }),

  read_note: tool({
    description: "Read one note in full, by id.",
    input: z.object({ id }),
    readOnly: true,
    run: async (echo, { id: noteId }) => {
      const note = await echo.notes.get(noteId);
      return note ? full(note) : null;
    },
  }),

  create_note: tool({
    description:
      "Write a new note, in the person's own words. Markdown. Leave folderId out and it lands in the Inbox, where they will see it.",
    input: z.object({ content: z.string().min(1), folderId: id.nullable().default(null) }),
    run: async (echo, input) => full(await echo.notes.create(input)),
  }),

  update_note: tool({
    description:
      "Change a note's text, or move it to another folder. Content replaces the whole note — read it first.",
    input: z.object({
      id,
      content: z.string().optional(),
      folderId: id.nullable().optional(),
    }),
    idempotent: true,
    run: async (echo, { id: noteId, ...update }) => full(await echo.notes.update(noteId, update)),
  }),

  set_note_archived: tool({
    description:
      "Archive a note or bring it back. Archiving is how a note is put away without losing it, and it is required before deleting.",
    input: z.object({ id, archived: z.boolean() }),
    idempotent: true,
    run: async (echo, { id: noteId, archived }) =>
      full(archived ? await echo.notes.archive(noteId) : await echo.notes.restore(noteId)),
  }),

  delete_note: tool({
    description:
      "Delete an archived note for good. There is no undo and no copy anywhere. Refused unless the note is already archived.",
    input: z.object({ id }),
    destructive: true,
    run: async (echo, { id: noteId }) => {
      const note = mustBeArchived(await echo.notes.get(noteId));
      await echo.notes.delete(note.id);
      return { deleted: note.id, title: note.title };
    },
  }),

  list_folders: tool({
    description: "Every folder, as a tree. Folders answer where a note lives.",
    input: nothing,
    readOnly: true,
    run: async (echo) => buildTree(await echo.folders.list()),
  }),

  create_folder: tool({
    description: "Make a folder. Pass parentId to nest it inside another.",
    input: z.object({ name: folderSchema.shape.name, parentId: id.nullable().default(null) }),
    run: async (echo, input) => echo.folders.create(input),
  }),

  update_folder: tool({
    description:
      "Rename a folder, move it under another, or pass parentId null to move it to the top.",
    input: z.object({
      id,
      name: folderSchema.shape.name.optional(),
      parentId: id.nullable().optional(),
    }),
    idempotent: true,
    run: async (echo, { id: folderId, name, parentId }) => {
      const renamed = name === undefined ? null : await echo.folders.rename(folderId, name);
      if (parentId === undefined) return renamed ?? (await echo.folders.get(folderId));
      return echo.folders.move(folderId, parentId);
    },
  }),

  delete_folder: tool({
    description:
      "Delete an empty folder. Refused while it holds notes or other folders — move them out first, so nothing disappears with it.",
    input: z.object({ id }),
    destructive: true,
    run: async (echo, { id: folderId }) => {
      const [notes, folders] = await Promise.all([
        echo.notes.list({ folderId, includeArchived: true, limit: 1 }),
        echo.folders.list(),
      ]);
      if (notes.length > 0) {
        throw new Error("This folder still holds notes. Move them somewhere else first.");
      }
      if (folders.some((folder) => folder.parentId === folderId)) {
        throw new Error("This folder still holds other folders. Move them somewhere else first.");
      }
      await echo.folders.delete(folderId);
      return { deleted: folderId };
    },
  }),

  list_categories: tool({
    description:
      "Every category, and which notes carry them. A category answers what a note is about, and a note may have several.",
    input: nothing,
    readOnly: true,
    run: async (echo) => {
      const [categories, assignments] = await Promise.all([
        echo.categories.list(),
        echo.categories.assignments(),
      ]);
      return { categories, assignments };
    },
  }),

  create_category: tool({
    description: "Make a category. Naming one that already exists returns the existing one.",
    input: z.object({ name: categorySchema.shape.name }),
    idempotent: true,
    run: async (echo, input) => echo.categories.create(input),
  }),

  update_category: tool({
    description: "Rename a category. Every note carrying it keeps it.",
    input: z.object({ id, name: categorySchema.shape.name }),
    idempotent: true,
    run: async (echo, { id: categoryId, name }) => echo.categories.rename(categoryId, name),
  }),

  delete_category: tool({
    description:
      "Delete a category. The notes keep everything else about themselves; only the label goes.",
    input: z.object({ id }),
    destructive: true,
    run: async (echo, { id: categoryId }) => {
      await echo.categories.delete(categoryId);
      return { deleted: categoryId };
    },
  }),

  set_note_category: tool({
    description: "Put a category on a note, or take it off.",
    input: z.object({ noteId: id, categoryId: id, assigned: z.boolean() }),
    idempotent: true,
    run: async (echo, { noteId, categoryId, assigned }) => {
      // Recorded as `auto`, never `user`: this is a reading of the note, and echo's rule is that a
      // reader's own choice outranks an inferred one. A label the reader put on may not be
      // overwritten from here, and one added from here is one they can take off — which teaches.
      if (assigned) await echo.categories.assign(noteId, categoryId, "auto");
      else await echo.categories.unassign(noteId, categoryId);
      return { noteId, categoryId, assigned };
    },
  }),

  list_tasks: tool({
    description:
      "Every task, due soonest first, undated last. Each one names the note it came from.",
    input: nothing,
    readOnly: true,
    run: async (echo) => echo.tasks.list(),
  }),

  create_task: tool({
    description:
      "Make a task out of something a note already says. It must name the note it came from — echo keeps no list beside the notes.",
    input: z.object({ noteId: id, title: taskSchema.shape.title, dueAt: when.default(null) }),
    run: async (echo, { noteId, title, dueAt }) =>
      echo.tasks.create({ noteId, title, dueAt: dueAt === null ? null : new Date(dueAt) }),
  }),

  update_task: tool({
    description:
      "Tick a task off, put it back, or change when it is due. Pass dueAt null to take the date off.",
    input: z.object({ id, completed: z.boolean().optional(), dueAt: when.optional() }),
    idempotent: true,
    run: async (echo, { id: taskId, completed, dueAt }) => {
      const ticked =
        completed === undefined ? null : await echo.tasks.setCompleted(taskId, completed);
      if (dueAt === undefined) return ticked;
      return echo.tasks.setDue(taskId, dueAt === null ? null : new Date(dueAt));
    },
  }),

  delete_task: tool({
    description: "Delete a task. The note it came from is untouched.",
    input: z.object({ id }),
    destructive: true,
    run: async (echo, { id: taskId }) => {
      await echo.tasks.delete(taskId);
      return { deleted: taskId };
    },
  }),

  week_ahead: tool({
    description:
      "What the notes themselves point at this week — dates and stretches of time the person wrote down, with the note each came from.",
    input: nothing,
    readOnly: true,
    run: async (echo) => echo.temporal.thisWeek(),
  }),

  learned_rules: tool({
    description:
      "What echo has worked out about how this person writes, from their own corrections. Read it to match them; you cannot add to it.",
    input: nothing,
    readOnly: true,
    run: async (echo) => echo.learning.rules(),
  }),
};

/**
 * `observations` and `learning.record` are deliberately absent, and this is not an oversight.
 *
 * Both tables are a record of what the reader themselves did: which notes they opened, next to
 * which, and where they told echo it had read them wrong. Every learned rule and every "since you
 * last looked" is measured against them. An assistant writing there would be inventing attention
 * nobody paid, and there is no way to tell the invented rows from the real ones afterwards.
 */

const describe = (): ToolSpec[] =>
  Object.entries(TOOLS).map(([name, definition]) => ({
    name,
    description: definition.description,
    inputSchema: z.toJSONSchema(definition.input, { io: "input" }) as Record<string, unknown>,
    readOnly: definition.readOnly ?? false,
    destructive: definition.destructive ?? false,
    idempotent: definition.idempotent ?? false,
  }));

/** Where the desktop shell is listening, and what proves a caller is allowed to ask. */
export type McpEndpoint = { url: string; token: string };

/**
 * The port echo listens on, and the same one every time.
 *
 * An assistant is configured once — the address goes in a config file, or into a command typed
 * months ago — so a port chosen freshly at each launch is an address that is wrong by the next
 * morning. The cost is that echo cannot start its server while something else holds this number,
 * which is a failure the reader can see and act on rather than a silent move to somewhere nobody
 * is looking.
 *
 * Declared here rather than in Rust because this is the one number both halves must agree on, and
 * the settings screen has to be able to say it out loud when the port is taken.
 */
export const MCP_PORT = 4319;

/** Where a client points, once the server is up. */
export const MCP_ADDRESS = `127.0.0.1:${MCP_PORT}`;

/** Open the door, or close it. */
export const startMcp = (): Promise<McpEndpoint> =>
  invoke<McpEndpoint>("mcp_start", { port: MCP_PORT });
export const stopMcp = (): Promise<void> => invoke("mcp_stop");

/** Exported for the test, which is the only thing that reads the registry without a Tauri window. */
export const registry = (): { instructions: string; tools: ToolSpec[] } => ({
  instructions: INSTRUCTIONS,
  tools: describe(),
});

/** One call, validated and run. Exported so the refusals above are testable without a window. */
export const callTool = async (
  echo: EchoRuntime,
  name: string,
  args: unknown,
): Promise<unknown> => {
  const definition = TOOLS[name];
  if (!definition) throw new Error(`echo has no tool called ${name}.`);
  return definition.run(echo, definition.input.parse(args ?? {}));
};

/**
 * Answer the desktop shell's tool calls for as long as this page is open.
 *
 * Nothing is served until the reader turns the server on in settings — the registry is declared
 * either way, because the shell has to be able to answer `initialize` the moment they do, and
 * declaring what echo *could* do opens nothing.
 */
export const serveMcp = (): (() => void) => {
  if (!isDesktopApp()) return () => {};

  const { instructions, tools } = registry();
  void invoke("mcp_ready", { instructions, tools }).catch((cause) =>
    console.error("[echo] the tool registry could not be published:", cause),
  );

  const listening = listen<{ id: number; tool: string; args: unknown }>("mcp:call", (event) => {
    const { id: call, tool: name, args } = event.payload;
    void getEcho()
      .then((echo) => callTool(echo, name, args))
      .then(
        (result) => invoke("mcp_reply", { id: call, result: result ?? null }),
        // Every failure goes back as text the caller can read and act on, including the refusals
        // above. A model that is told "archive it first" will archive it first.
        (cause: unknown) =>
          invoke("mcp_reply", {
            id: call,
            error: cause instanceof Error ? cause.message : String(cause),
          }),
      );
  });

  return () => void listening.then((stop) => stop());
};
