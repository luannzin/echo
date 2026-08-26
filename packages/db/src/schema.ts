import { DEFAULT_WORKSPACE_ID } from "@echo/types";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Postgres' own full-text type. Drizzle has no built-in for it, and it needs one here because the
 * alternative — building a `tsvector` per row at query time — is a full table scan on every
 * keystroke. Stored and indexed, the same search is a lookup.
 */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/**
 * Raw bytes. A vector is 384 floats, and storing them as a Postgres array meant writing them out as
 * text and parsing them back — at ten thousand notes that was two and a half seconds of reading and
 * twice the storage. As bytes they are the same memory the model produced, and they come back the
 * same way.
 *
 * Little-endian, which every platform this runs on is. A sync protocol that ever crosses that line
 * converts here, in one place, rather than everywhere a vector is read.
 */
const bytes = customType<{ data: Uint8Array }>({
  dataType: () => "bytea",
});

/**
 * One schema for both hosts: PGlite locally, PostgreSQL on a server. `workspace_id` is present from
 * the first migration so hosted multi-workspace mode is additive.
 */
export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().default(DEFAULT_WORKSPACE_ID),
    parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("folders_parent_idx").on(table.parentId)],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().default(DEFAULT_WORKSPACE_ID),
    /** null means Inbox. Deleting a folder drops its notes back there rather than destroying them. */
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * Derived by the database from the note itself, so it can never drift out of step with what it
     * indexes. `simple` applies no language-specific stemming, which is what keeps every language
     * on equal terms — meaning is the embedding model's job.
     *
     * The title carries weight A and the body weight B, so a note *about* the question outranks one
     * that merely mentions it. Never selected: it is an index, not content, and reading it back
     * would cost more than the query it speeds up.
     */
    search: tsvector("search")
      .notNull()
      .generatedAlwaysAs(
        (): SQL =>
          sql`setweight(to_tsvector('simple', ${notes.title}), 'A') || setweight(to_tsvector('simple', ${notes.content}), 'B')`,
      ),
  },
  (table) => [
    index("notes_folder_idx").on(table.folderId),
    index("notes_updated_at_idx").on(table.updatedAt),
    index("notes_search_idx").using("gin", table.search),
  ],
);

/**
 * Every column of a note except the search index. Repositories select these explicitly, because
 * `select *` would drag a tsvector the size of the note along with every row it returns.
 */
export const noteColumns = {
  id: notes.id,
  workspaceId: notes.workspaceId,
  folderId: notes.folderId,
  title: notes.title,
  content: notes.content,
  archivedAt: notes.archivedAt,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
} as const;

/**
 * Derived data, never the source of truth: a row here can be deleted and rebuilt from the note.
 * `model` records who produced the vector, so changing models invalidates the old ones instead of
 * silently comparing incompatible spaces.
 *
 * It replaces an earlier table that held the same vectors as a Postgres array of reals. Derived data
 * is the one thing a schema may throw away rather than convert: the notes are untouched, and the
 * analyzer rebuilds every vector on the next pass.
 *
 * ponytail: bytes, with similarity computed in TypeScript against an index held in memory. PGlite
 * ships no pgvector build today; on a server this column becomes `vector(384)` and gains an index
 * without touching the domain, because nothing above `@echo/db` knows how a vector is stored.
 */

/**
 * Every correction a reader has made, kept as it happened. Rules are derived from these rows by
 * `@echo/learning` and never stored: forgetting a rule means deleting the events behind it, so
 * there is no second place where a belief about the reader can survive.
 */
export const learningEvents = pgTable(
  "learning_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().default(DEFAULT_WORKSPACE_ID),
    type: text("type").notNull(),
    /** Which family the subject belongs to: a task phrase, a deadline phrase, a note. */
    kind: text("kind").notNull(),
    /** The phrase or note id the correction is about. */
    subject: text("subject").notNull(),
    /** Where it happened. The note may go; the lesson stays. */
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("learning_events_subject_idx").on(table.kind, table.subject),
    index("learning_events_created_at_idx").on(table.createdAt),
  ],
);

export const noteVectors = pgTable("note_vectors", {
  noteId: uuid("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  dimensions: integer("dimensions").notNull(),
  values: bytes("values").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
