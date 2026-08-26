import { DEFAULT_WORKSPACE_ID } from "@echo/types";
import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
  },
  (table) => [
    index("notes_folder_idx").on(table.folderId),
    index("notes_updated_at_idx").on(table.updatedAt),
  ],
);

/**
 * Derived data, never the source of truth: a row here can be deleted and rebuilt from the note.
 * `model` records who produced the vector, so changing models invalidates the old ones instead of
 * silently comparing incompatible spaces.
 *
 * ponytail: `real[]` with similarity computed in TypeScript. PGlite ships no pgvector build today;
 * on a server this column casts to `vector(384)` and gains an index without touching the domain.
 */
export const noteEmbeddings = pgTable("note_embeddings", {
  noteId: uuid("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  dimensions: integer("dimensions").notNull(),
  values: real("values").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
