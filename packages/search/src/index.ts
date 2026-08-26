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
  /** 0..1 affinity from `@echo/learning`. Absent means echo has learned nothing about this note. */
  interaction?: number;
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
  /**
   * A note that matches the query on neither its words nor its meaning is not a result, however
   * recently it was written and however often it has been opened. Recency and habit are
   * tie-breakers between answers, never a reason to be an answer.
   */
  minimumSemantic?: number;
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
    minimumSemantic = 0,
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
        interaction: candidate.interaction ?? 0,
      };
      return {
        note: candidate.note,
        score: combine(signals, weights),
        semantic,
        lexical: signals.lexical,
      };
    })
    .filter((result) => result.score > minimumScore)
    .filter((result) => result.lexical > 0 || result.semantic >= minimumSemantic)
    .sort((a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id))
    .slice(0, limit);
}

/**
 * Close enough that it is probably the same thought written twice. High on purpose: a false
 * duplicate warning costs the reader more attention than a missed one.
 */
export const DUPLICATE_SIMILARITY = 0.9;

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
