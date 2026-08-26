export type RankingWeights = {
  semantic: number;
  lexical: number;
  recency: number;
  /** What this reader has actually opened before. Small on purpose — see below. */
  interaction: number;
};

/**
 * Coefficients, not code. Ranking behaviour is configuration a test can pin down and a settings
 * screen could expose — never something buried in a component.
 *
 * Interaction is deliberately the smallest weight. It is enough to break a tie between two notes
 * that are equally about the query, and never enough to put a note the reader merely visits often
 * above one that actually answers what they asked.
 */
export const DEFAULT_WEIGHTS: RankingWeights = {
  semantic: 0.55,
  lexical: 0.25,
  recency: 0.1,
  interaction: 0.1,
};

/** A note loses half its recency credit every two weeks. Old notes rank on merit, not freshness. */
const RECENCY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

export const recencyScore = (updatedAt: Date, now: Date): number => {
  const age = Math.max(0, now.getTime() - updatedAt.getTime());
  return 2 ** (-age / RECENCY_HALF_LIFE_MS);
};

export type Signals = {
  /** Cosine similarity, already in 0..1 for unit vectors that point the same way. */
  semantic: number;
  /** Lexical relevance, normalized by the caller against the best hit in the set. */
  lexical: number;
  recency: number;
  /** 0..1 from `@echo/learning`: how often this reader has opened this note before. */
  interaction?: number;
};

export const combine = (signals: Signals, weights: RankingWeights = DEFAULT_WEIGHTS): number => {
  return (
    signals.semantic * weights.semantic +
    signals.lexical * weights.lexical +
    signals.recency * weights.recency +
    (signals.interaction ?? 0) * weights.interaction
  );
};

/** Scales a set of raw lexical ranks into 0..1 so one engine's scale never dominates the blend. */
export const normalizeLexical = (scores: number[]): number[] => {
  const highest = Math.max(0, ...scores);
  if (highest === 0) return scores.map(() => 0);
  return scores.map((score) => Math.max(0, score) / highest);
};
