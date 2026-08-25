import { DEFAULT_WORKSPACE_ID } from "@echo/types";
import { type AnyPgColumn, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
