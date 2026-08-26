import type { NoteListOptions, NotePatch, NoteRepository } from "@echo/core";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "./client";
import { noteColumns, notes } from "./schema";

/**
 * Columns are named explicitly on every read. The table carries a stored `tsvector` for search, and
 * `select *` would return it with every row — a second copy of the note, in a form nothing here can
 * use, on the one query that runs most often.
 */
export const createNoteRepository = (db: Database): NoteRepository => ({
  async insert(note) {
    const [row] = await db.insert(notes).values(note).returning(noteColumns);
    if (!row) throw new Error("Insert returned no row");
    return row;
  },

  async update(id, patch: NotePatch) {
    const [row] = await db.update(notes).set(patch).where(eq(notes.id, id)).returning(noteColumns);
    if (!row) throw new Error(`Note ${id} not found`);
    return row;
  },

  async delete(id) {
    await db.delete(notes).where(eq(notes.id, id));
  },

  async get(id) {
    const [row] = await db.select(noteColumns).from(notes).where(eq(notes.id, id)).limit(1);
    return row ?? null;
  },

  list(options: NoteListOptions = {}) {
    const filters = [
      options.folderId === undefined
        ? undefined
        : options.folderId === null
          ? isNull(notes.folderId)
          : eq(notes.folderId, options.folderId),
      options.includeArchived ? undefined : isNull(notes.archivedAt),
    ].filter((filter) => filter !== undefined);

    return db
      .select(noteColumns)
      .from(notes)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(notes.updatedAt))
      .limit(options.limit ?? 200);
  },
});
