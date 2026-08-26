import type { Note } from "@echo/types";
import {
  combine,
  DEFAULT_WEIGHTS,
  normalizeLexical,
  type RankingWeights,
  recencyScore,
} from "./ranking";

export * from "./ranking";
export * from "./vector-index";

export type SearchCandidate = {
  note: Note;
  /**
   * Cosine similarity to the question, 0..1, already computed. Ranking blends signals; measuring
   * them belongs to whoever holds the vectors — the index, which can compare a whole corpus without
   * handing a single one out. Absent means the note has no vector yet, and it competes without one.
   */
  semantic?: number;
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
 * no vector yet are ranked on what is known about them rather than dropped.
 */
export function rank(candidates: SearchCandidate[], options: SearchOptions = {}): SearchResult[] {
  const {
    weights = DEFAULT_WEIGHTS,
    now = new Date(),
    limit = 20,
    minimumScore = 0,
    minimumSemantic = 0,
  } = options;

  const lexical = normalizeLexical(candidates.map((candidate) => candidate.lexical ?? 0));

  return candidates
    .map((candidate, index) => {
      const semantic = Math.max(0, candidate.semantic ?? 0);
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
 * Below this, two notes are not about the same thing and saying so would be noise. Relatedness is
 * deliberately judged on meaning alone — when a note was last touched says nothing about what it is
 * about — which is why it is the index that answers it, and not `rank`.
 */
export const RELATED_SIMILARITY = 0.55;
