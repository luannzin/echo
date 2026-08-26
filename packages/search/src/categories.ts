/**
 * What a note is about, worked out from what the notes nearest it are labelled with. The same idea
 * as `suggestDestinations` and deliberately not the same function: a note lives in one folder, so
 * folders share out a vote between them, while a note can carry any number of categories, so each
 * category is judged on its own against the whole neighbourhood.
 */

/** A note near the one being read, and the labels its reader put on it. */
export type LabelledNeighbour = {
  noteId: string;
  categoryIds: readonly string[];
  /** Cosine similarity to the note being categorized, 0..1. */
  similarity: number;
};

export type CategoryGuess = {
  categoryId: string;
  /** 0..1 — how much of the neighbourhood, weighted by closeness, carries this label. */
  confidence: number;
  /** The neighbours that argued for it, closest first. This is the answer to "why?". */
  because: string[];
};

export type SuggestCategoriesOptions = {
  limit?: number;
  /** A multiplier: 1 leaves the vote alone, below 1 damps a label the reader keeps taking off. */
  weightOf?: (categoryId: string) => number;
  minimumConfidence?: number;
  /** A label one lone neighbour carries is that neighbour's opinion, not a pattern. */
  minimumVoters?: number;
};

/** Half the neighbourhood. Below it, the label describes some of what the note is near, not the note. */
const DEFAULT_MINIMUM = 0.5;
const DEFAULT_MINIMUM_VOTERS = 2;

export const suggestCategories = (
  neighbours: readonly LabelledNeighbour[],
  {
    limit = 3,
    weightOf,
    minimumConfidence = DEFAULT_MINIMUM,
    minimumVoters = DEFAULT_MINIMUM_VOTERS,
  }: SuggestCategoriesOptions = {},
): CategoryGuess[] => {
  const usable = neighbours.filter((neighbour) => neighbour.similarity > 0);
  const total = usable.reduce((sum, neighbour) => sum + neighbour.similarity, 0);
  if (total === 0) return [];

  const votes = new Map<string, { weight: number; because: LabelledNeighbour[] }>();
  for (const neighbour of usable) {
    for (const categoryId of new Set(neighbour.categoryIds)) {
      const tally = votes.get(categoryId) ?? { weight: 0, because: [] };
      tally.weight += neighbour.similarity;
      tally.because.push(neighbour);
      votes.set(categoryId, tally);
    }
  }

  return [...votes.entries()]
    .filter(([, tally]) => tally.because.length >= minimumVoters)
    .map(([categoryId, tally]) => ({
      categoryId,
      // The share is taken before the reader's history is applied, so damping one label can never
      // promote another: a rejected guess goes quiet, it does not hand its votes to the runner-up.
      confidence: (tally.weight / total) * (weightOf?.(categoryId) ?? 1),
      because: tally.because
        .sort((a, b) => b.similarity - a.similarity || a.noteId.localeCompare(b.noteId))
        .map((neighbour) => neighbour.noteId),
    }))
    .filter((guess) => guess.confidence >= minimumConfidence)
    .sort((a, b) => b.confidence - a.confidence || a.categoryId.localeCompare(b.categoryId))
    .slice(0, limit);
};
