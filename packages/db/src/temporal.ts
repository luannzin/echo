import type { StoredMentions, TemporalRepository } from "@echo/core";
import type { Mention } from "@echo/parser";
import { eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { notes, noteTemporal } from "./schema";

/** JSON has no dates. What went in as an instant comes back as a string, and is put back. */
const revive = (mention: Mention): Mention => ({
  ...mention,
  start: mention.start === null ? null : new Date(mention.start),
  end: mention.end === null ? null : new Date(mention.end),
});

export const createTemporalRepository = (db: Database): TemporalRepository => {
  return {
    async put(noteId, mentions, parsedAt) {
      await db.insert(noteTemporal).values({ noteId, parsedAt, mentions }).onConflictDoUpdate({
        target: noteTemporal.noteId,
        set: { parsedAt, mentions },
      });
    },

    /**
     * A note with no row has never been read; a note whose row predates its last edit has been read
     * as something it no longer says. A note that was read and named no date at all keeps its row,
     * which is what stops it from being re-read on every pass forever.
     */
    async pending(limit = 200) {
      const rows = await db
        .select({ id: notes.id })
        .from(notes)
        .leftJoin(noteTemporal, eq(noteTemporal.noteId, notes.id))
        .where(sql`${noteTemporal.noteId} is null or ${noteTemporal.parsedAt} < ${notes.updatedAt}`)
        .limit(limit);
      return rows.map((row) => row.id);
    },

    /**
     * Every note whose reading of time overlaps the window.
     *
     * Spans named against something that happened — "depois que comecei HEREZE" — are excluded here.
     * They are stored exactly as the note said them, with the anchor unresolved, because the date a
     * project started is a fact about the corpus and not about the note; resolving them belongs
     * where the folder and category names are known. Left in, an unresolved anchor reads as an open
     * edge and would match every window there is.
     */
    async inWindow(from, to) {
      const { rows } = await db.execute<{ note_id: string; mention: Mention }>(sql`
        select nt.note_id, m as mention
        from note_temporal nt, jsonb_array_elements(nt.mentions) m
        where m->>'anchor' is null
          and coalesce((m->>'start')::timestamptz, '-infinity'::timestamptz) <= ${to.toISOString()}::timestamptz
          and coalesce((m->>'end')::timestamptz, 'infinity'::timestamptz) >= ${from.toISOString()}::timestamptz
      `);

      const byNote = new Map<string, Mention[]>();
      for (const row of rows) {
        const held = byNote.get(row.note_id) ?? [];
        held.push(revive(row.mention));
        byNote.set(row.note_id, held);
      }
      return [...byNote.entries()].map(([noteId, mentions]) => ({
        noteId,
        mentions,
      })) satisfies StoredMentions[];
    },

    async get(noteId) {
      const [row] = await db
        .select({ mentions: noteTemporal.mentions })
        .from(noteTemporal)
        .where(eq(noteTemporal.noteId, noteId));
      return ((row?.mentions ?? []) as Mention[]).map(revive);
    },
  };
};
