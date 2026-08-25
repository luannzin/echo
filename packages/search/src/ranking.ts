export type RankingWeights = {
  semantic: number;
  lexical: number;
  recency: number;
};

/**
 * Coefficients, not code. Ranking behaviour is configuration a test can pin down and a settings
 * screen could expose — never something buried in a component.
 */
export const DEFAULT_WEIGHTS: RankingWeights = {
  semantic: 0.6,
  lexical: 0.3,
  recency: 0.1,
};

/** A note loses half its recency credit every two weeks. Old notes rank on merit, not freshness. */
const RECENCY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

export function recencyScore(updatedAt: Date, now: Date): number {
  const age = Math.max(0, now.getTime() - updatedAt.getTime());
  return 2 ** (-age / RECENCY_HALF_LIFE_MS);
}

export type Signals = {
  /** Cosine similarity, already in 0..1 for unit vectors that point the same way. */
  semantic: number;
  /** Lexical relevance, normalized by the caller against the best hit in the set. */
  lexical: number;
  recency: number;
};

export function combine(signals: Signals, weights: RankingWeights = DEFAULT_WEIGHTS): number {
  return (
    signals.semantic * weights.semantic +
    signals.lexical * weights.lexical +
    signals.recency * weights.recency
  );
}

/** Scales a set of raw lexical ranks into 0..1 so one engine's scale never dominates the blend. */
export function normalizeLexical(scores: number[]): number[] {
  const highest = Math.max(0, ...scores);
  if (highest === 0) return scores.map(() => 0);
  return scores.map((score) => Math.max(0, score) / highest);
}
