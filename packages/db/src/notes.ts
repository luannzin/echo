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

    const query = db
      .select(noteColumns)
      .from(notes)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(notes.updatedAt));

    // Every other list here returns everything it has, and notes were the one exception: a default
    // limit meant a caller who asked for "the notes" was handed the most recent few and told
    // nothing about the rest. The app holds the whole corpus in memory by design — the vector index
    // does, search scans it, the stream renders it — so a page it never asked for was a silent
    // truncation of the only list that matters. A caller that wants a page says how big.
    return options.limit === undefined ? query : query.limit(options.limit);
  },
});
