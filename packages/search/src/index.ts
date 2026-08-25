import { similarity } from "@echo/embeddings";
import type { Note } from "@echo/types";
import {
  combine,
  DEFAULT_WEIGHTS,
  normalizeLexical,
  type RankingWeights,
  recencyScore,
} from "./ranking";

export * from "./ranking";

export type SearchCandidate = {
  note: Note;
  /** Missing when the note has not been embedded yet — it still competes on the other signals. */
  embedding?: Float32Array;
  /** Raw lexical rank from the database, or 0 when the query did not match textually. */
  lexical?: number;
};

export type SearchResult = {
  note: Note;
  score: number;
  semantic: number;
  lexical: number;
};

export type SearchOptions = {
  queryEmbedding?: Float32Array;
  weights?: RankingWeights;
  now?: Date;
  limit?: number;
  /** Results below this score are noise; showing them would make search feel wrong. */
  minimumScore?: number;
};

/**
 * Hybrid ranking: meaning, words and recency, blended by weights the caller can change. Notes with
 * no embedding yet are ranked on what is known about them rather than dropped.
 */
export function rank(candidates: SearchCandidate[], options: SearchOptions = {}): SearchResult[] {
  const {
    queryEmbedding,
    weights = DEFAULT_WEIGHTS,
    now = new Date(),
    limit = 20,
    minimumScore = 0,
  } = options;

  const lexical = normalizeLexical(candidates.map((candidate) => candidate.lexical ?? 0));

  return candidates
    .map((candidate, index) => {
      const semantic =
        queryEmbedding && candidate.embedding
          ? Math.max(0, similarity(queryEmbedding, candidate.embedding))
          : 0;
      const signals = {
        semantic,
        lexical: lexical[index] ?? 0,
        recency: recencyScore(candidate.note.updatedAt, now),
      };
      return {
        note: candidate.note,
        score: combine(signals, weights),
        semantic,
        lexical: signals.lexical,
      };
    })
    .filter((result) => result.score > minimumScore)
    .sort((a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id))
    .slice(0, limit);
}

/**
 * Notes closest in meaning to one note. Recency is deliberately excluded: relatedness is about what
 * a note is about, not when it was last touched.
 */
export function relatedTo(
  embedding: Float32Array,
  candidates: SearchCandidate[],
  {
    limit = 5,
    minimumSimilarity = 0.55,
    excludeNoteId,
  }: {
    limit?: number;
    minimumSimilarity?: number;
    excludeNoteId?: string;
  } = {},
): SearchResult[] {
  return candidates
    .filter((candidate) => candidate.embedding && candidate.note.id !== excludeNoteId)
    .map((candidate) => {
      const semantic = similarity(embedding, candidate.embedding as Float32Array);
      return { note: candidate.note, score: semantic, semantic, lexical: 0 };
    })
    .filter((result) => result.semantic >= minimumSimilarity)
    .sort((a, b) => b.semantic - a.semantic || a.note.id.localeCompare(b.note.id))
    .slice(0, limit);
}
