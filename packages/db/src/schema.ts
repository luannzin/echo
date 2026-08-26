import { DEFAULT_WORKSPACE_ID } from "@echo/types";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  customType,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Postgres' own full-text type. Built per row at query time it would be a full table scan on
 *  every keystroke; stored and indexed, the same search is a lookup. */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/**
 * Raw bytes. As a Postgres array, ten thousand vectors cost 2.5s of parsing and twice the storage;
 * as bytes they are the memory the model produced. Little-endian — a sync protocol that ever
 * crosses that line converts here, in one place.
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
     * Derived by the database, so it can never drift out of step with what it indexes. `simple`
     * applies no stemming, which keeps every language on equal terms — meaning is the model's job.
     * Title weighs A and body B, so a note *about* the question outranks one that mentions it.
     * Never selected: it is an index, not content.
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

/** Every column except the search index: `select *` would drag a tsvector along with every row. */
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
 * `model` records who produced the vector, so changing models invalidates the old ones rather than
 * silently comparing incompatible spaces.
 *
 * ponytail: bytes, with similarity computed in TypeScript against an index held in memory. PGlite
 * ships no pgvector build today; on a server this column becomes `vector(384)` and gains an index
 * without touching the domain.
 */

/**
 * A label that goes on notes rather than a place notes go into. Unique by name inside a workspace,
 * because two categories spelled the same are one category the reader has to keep choosing between.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().default(DEFAULT_WORKSPACE_ID),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("categories_name_key").on(table.workspaceId, table.name)],
);

/**
 * Which categories a note carries. `source` is the whole reason this table has a column beyond its
 * two keys: an `auto` row is echo's reading and may be replaced by a later one, a `user` row is a
 * stated fact and nothing inferred is ever allowed to write over it.
 */
export const noteCategories = pgTable(
  "note_categories",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.noteId, table.categoryId] }),
    index("note_categories_category_idx").on(table.categoryId),
  ],
);

/**
 * Every correction as it happened. Rules are derived from these rows and never stored, so forgetting
 * one means deleting the events behind it — there is no second place a belief can survive.
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

/**
 * A task the writer agreed to, and the note it came out of. Deleting the note deletes the task:
 * a task with no source is a list item echo has no way to explain.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().default(DEFAULT_WORKSPACE_ID),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tasks_note_idx").on(table.noteId), index("tasks_due_at_idx").on(table.dueAt)],
);
