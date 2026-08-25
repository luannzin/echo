import type { LexicalMatch, LexicalSearch } from "@echo/core";
import { sql } from "drizzle-orm";
import type { Database } from "./client";

/**
 * Full-text search in the database, using the `simple` configuration on purpose: it applies no
 * language-specific stemming, so notes in any language are treated alike. Meaning is the embedding
 * model's job; this side only has to find literal matches well.
 */
export function createLexicalSearch(db: Database): LexicalSearch {
  return {
    async search(query, limit = 50) {
      const trimmed = query.trim();
      if (trimmed.length === 0) return [];

      const { rows } = await db.execute<{ id: string; rank: number }>(sql`
        select id,
               ts_rank(
                 to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')),
                 plainto_tsquery('simple', ${trimmed})
               ) as rank
        from notes
        where to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
              @@ plainto_tsquery('simple', ${trimmed})
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
