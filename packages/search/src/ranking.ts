export type RankingWeights = {
  semantic: number;
  lexical: number;
  recency: number;
  /** What this reader has actually opened before. Small on purpose — see below. */
  interaction: number;
  /**
   * How much a note belongs to what is being asked about, beyond what it says: the same project,
   * the same concepts, the same stretch of time, and the notes this reader opens alongside it.
   */
  context: number;
};

/**
 * Coefficients, not code. Ranking behaviour is configuration a test can pin down and a settings
 * screen could expose — never something buried in a component.
 *
 * Interaction is deliberately the smallest weight. It is enough to break a tie between two notes
 * that are equally about the query, and never enough to put a note the reader merely visits often
 * above one that actually answers what they asked.
 *
 * Context is the second largest, and meaning gave up ten points to it. A note can be almost exactly
 * about the same words as another and still be the wrong note — and a note from the same project,
 * carrying the same concepts, written in the same fortnight and opened alongside it every time is
 * usually the right one even when it says less of the same. Weighted so a note with the whole of
 * that behind it can pass one about fifteen points closer in meaning, and no further.
 */
export const DEFAULT_WEIGHTS: RankingWeights = {
  semantic: 0.45,
  lexical: 0.22,
  recency: 0.08,
  interaction: 0.07,
  context: 0.18,
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
  /** 0..1 from `contextScore`: how much the note belongs to what is being asked about. */
  context?: number;
};

export const combine = (signals: Signals, weights: RankingWeights = DEFAULT_WEIGHTS): number => {
  return (
    signals.semantic * weights.semantic +
    signals.lexical * weights.lexical +
    signals.recency * weights.recency +
    (signals.interaction ?? 0) * weights.interaction +
    (signals.context ?? 0) * weights.context
  );
};

/** Scales a set of raw lexical ranks into 0..1 so one engine's scale never dominates the blend. */
export const normalizeLexical = (scores: number[]): number[] => {
  const highest = Math.max(0, ...scores);
  if (highest === 0) return scores.map(() => 0);
  return scores.map((score) => Math.max(0, score) / highest);
};
