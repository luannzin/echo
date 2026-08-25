import type { NoteListOptions, NotePatch, NoteRepository } from "@echo/core";
import type { Note } from "@echo/types";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "./client";
import { notes } from "./schema";

export function createNoteRepository(db: Database): NoteRepository {
  return {
    async insert(note) {
      const [row] = await db.insert(notes).values(note).returning();
      return required(row);
    },

    async update(id, patch: NotePatch) {
      const [row] = await db.update(notes).set(patch).where(eq(notes.id, id)).returning();
      if (!row) throw new Error(`Note ${id} not found`);
      return row;
    },

    async delete(id) {
      await db.delete(notes).where(eq(notes.id, id));
    },

    async get(id) {
      const [row] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
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
        .select()
        .from(notes)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(notes.updatedAt))
        .limit(options.limit ?? 200);
    },
  };
}

function required(row: Note | undefined): Note {
  if (!row) throw new Error("Insert returned no row");
  return row;
}
