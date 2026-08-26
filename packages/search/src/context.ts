/**
 * How much a note belongs to what is being asked about, beyond what it says.
 *
 * Meaning alone gets this wrong in a way that is obvious once you see it: a note can be almost
 * exactly about the same words as another and still be the wrong note, while one that says less of
 * the same — but comes out of the same project, carries the same concepts, was written in the same
 * fortnight, and is the note you open alongside it every single time — is the one you meant.
 *
 * Nothing here is trained and nothing is a black box. Every part of the score can be named back to
 * the reader as a sentence about their own notes.
 */

export type ContextSignals = {
  /** Both notes live in the same folder. The strongest single signal, and the cheapest. */
  sameProject?: boolean;
  /** How much of their labelling they share, 0..1 (Jaccard over concepts and categories). */
  sharedConcepts?: number;
  /** Written inside the same stretch of time as the note or the period being asked about. */
  samePeriod?: boolean;
  /** How often this reader opens the two together, 0..1 against the most-paired note there is. */
  coOpened?: number;
};

export type ContextWeights = {
  sameProject: number;
  sharedConcepts: number;
  samePeriod: number;
  coOpened: number;
};

/**
 * A project is where the reader put it, so it counts for most. Being opened together is next: it is
 * the only one of these the notes themselves cannot tell you, and the only one that gets at "these
 * two go together" when nothing about their text says so.
 */
export const DEFAULT_CONTEXT_WEIGHTS: ContextWeights = {
  sameProject: 0.35,
  coOpened: 0.3,
  sharedConcepts: 0.25,
  samePeriod: 0.1,
};

/** 0..1. Every part is optional: a signal nobody could work out contributes nothing, not a guess. */
export const contextScore = (
  signals: ContextSignals,
  weights: ContextWeights = DEFAULT_CONTEXT_WEIGHTS,
): number =>
  (signals.sameProject ? weights.sameProject : 0) +
  (signals.coOpened ?? 0) * weights.coOpened +
  (signals.sharedConcepts ?? 0) * weights.sharedConcepts +
  (signals.samePeriod ? weights.samePeriod : 0);

/** How much two sets of labels overlap. Two unlabelled notes have nothing in common, not everything. */
export const overlap = (a: readonly string[], b: readonly string[]): number => {
  const held = new Set(a);
  const other = new Set(b);
  if (held.size === 0 || other.size === 0) return 0;

  let shared = 0;
  for (const value of other) if (held.has(value)) shared += 1;
  // Both sets have something in them, so the union does too.
  return shared / (held.size + other.size - shared);
};

/** Notes written within this of each other belong to the same stretch of the reader's work. */
const SAME_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export const samePeriod = (a: Date, b: Date): boolean =>
  Math.abs(a.getTime() - b.getTime()) <= SAME_PERIOD_MS;

/** Why a note was ranked where it was, as things the reader can check rather than as a number. */
export const explainContext = (signals: ContextSignals): string[] => {
  const because: string[] = [];
  if (signals.sameProject) because.push("it is in the same project");
  if ((signals.coOpened ?? 0) > 0) because.push("you usually open them together");
  if ((signals.sharedConcepts ?? 0) > 0) because.push("it is about the same things");
  if (signals.samePeriod) because.push("you wrote them around the same time");
  return because;
};
