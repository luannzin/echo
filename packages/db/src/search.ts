import type { LexicalMatch, LexicalSearch } from "@echo/core";
import { sql } from "drizzle-orm";
import type { Database } from "./client";

/**
 * Full-text search against the stored index on `notes.search`, using the `simple` configuration on
 * purpose: it applies no language-specific stemming, so notes in any language are treated alike.
 * Meaning is the embedding model's job; this side only has to find literal matches, and find them
 * fast enough that a search can run while the question is still being typed.
 *
 * The index is a generated column, so there is nothing to keep in step by hand — writing a note
 * updates it in the same statement.
 */
export function createLexicalSearch(db: Database): LexicalSearch {
  return {
    async search(query, limit = 50) {
      const trimmed = query.trim();
      if (trimmed.length === 0) return [];

      // Every whole word the reader has finished, plus a prefix match on the one they are still
      // typing: searching for "cach" finds the caching note before the "e" arrives, which is what
      // makes results feel like they are keeping up rather than catching up.
      const terms = trimmed
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length > 0);
      if (terms.length === 0) return [];
      const tsquery = terms.map((term, index) => (index === terms.length - 1 ? `${term}:*` : term));

      const { rows } = await db.execute<{ id: string; rank: number }>(sql`
        select id, ts_rank(search, query) as rank
        from notes, to_tsquery('simple', ${tsquery.join(" & ")}) as query
        where search @@ query
          and archived_at is null
        order by rank desc
        limit ${limit}
      `);

      return rows.map((row) => ({
        noteId: row.id,
        rank: Number(row.rank),
      })) satisfies LexicalMatch[];
    },
  };
}
