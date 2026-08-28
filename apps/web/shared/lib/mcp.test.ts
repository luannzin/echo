import { expect, test } from "bun:test";
import type { Note } from "@echo/types";
import type { EchoRuntime } from "./echo";
import { callTool, registry } from "./mcp";

const note = (over: Partial<Note> = {}): Note => ({
  id: "11111111-1111-4111-8111-111111111111",
  workspaceId: "22222222-2222-4222-8222-222222222222",
  folderId: null,
  title: "A note",
  content: "A note",
  archivedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...over,
});

/** Only the parts a tool under test actually reaches. Anything else here would be scenery. */
const fakeEcho = (parts: Record<string, unknown>): EchoRuntime => parts as unknown as EchoRuntime;

test("every tool advertises a schema a caller can read", () => {
  const { tools, instructions } = registry();
  expect(instructions.length).toBeGreaterThan(0);
  for (const tool of tools) {
    expect(tool.name).toMatch(/^[a-z][a-z_]*$/);
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.inputSchema.type).toBe("object");
  }
});

test("the reader's own behaviour is not something a caller can write", () => {
  const names = registry().tools.map((tool) => tool.name);
  // Observations and learning events are a record of what the reader did. A tool that could add to
  // them would let an assistant invent attention nobody paid, and nothing afterwards could tell the
  // invented rows from the real ones.
  expect(names).not.toContain("record_observation");
  expect(names).not.toContain("record_learning");
  expect(names).toContain("learned_rules");
});

test("a tool that destroys says so, and a tool that only reads says that", () => {
  const byName = new Map(registry().tools.map((tool) => [tool.name, tool]));
  expect(byName.get("delete_note")?.destructive).toBe(true);
  expect(byName.get("delete_folder")?.destructive).toBe(true);
  expect(byName.get("search_notes")?.readOnly).toBe(true);
  expect(byName.get("create_note")?.readOnly).toBe(false);
});

test("a note cannot be deleted until it has been archived", async () => {
  const living = note();
  const echo = fakeEcho({
    notes: {
      get: async () => living,
      delete: async () => {
        throw new Error("delete should never have been reached");
      },
    },
  });

  await expect(callTool(echo, "delete_note", { id: living.id })).rejects.toThrow(/not archived/i);
});

test("an archived note deletes", async () => {
  const archived = note({ archivedAt: new Date("2026-02-01") });
  let deleted: string | undefined;
  const echo = fakeEcho({
    notes: {
      get: async () => archived,
      delete: async (id: string) => {
        deleted = id;
      },
    },
  });

  await expect(callTool(echo, "delete_note", { id: archived.id })).resolves.toMatchObject({
    deleted: archived.id,
  });
  expect(deleted).toBe(archived.id);
});

test("a folder holding anything is refused", async () => {
  const folderId = "33333333-3333-4333-8333-333333333333";
  const holding = fakeEcho({
    notes: { list: async () => [note({ folderId })] },
    folders: { list: async () => [], delete: async () => {} },
  });
  await expect(callTool(holding, "delete_folder", { id: folderId })).rejects.toThrow(
    /still holds/i,
  );

  const nested = fakeEcho({
    notes: { list: async () => [] },
    folders: {
      list: async () => [{ id: "44444444-4444-4444-8444-444444444444", parentId: folderId }],
      delete: async () => {},
    },
  });
  await expect(callTool(nested, "delete_folder", { id: folderId })).rejects.toThrow(/still holds/i);
});

test("an empty folder deletes", async () => {
  const folderId = "33333333-3333-4333-8333-333333333333";
  const echo = fakeEcho({
    notes: { list: async () => [] },
    folders: { list: async () => [], delete: async () => {} },
  });
  await expect(callTool(echo, "delete_folder", { id: folderId })).resolves.toMatchObject({
    deleted: folderId,
  });
});

test("a call with arguments the schema refuses never reaches the notes", async () => {
  const echo = fakeEcho({
    notes: {
      create: async () => {
        throw new Error("create should never have been reached");
      },
    },
  });
  await expect(callTool(echo, "create_note", { content: "" })).rejects.toThrow();
  await expect(callTool(echo, "no_such_tool", {})).rejects.toThrow(/no tool called/i);
});
