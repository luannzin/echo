/**
 * Where a note probably belongs, worked out from where notes like it already are.
 *
 * There is no classifier here and no keyword table. The corpus is the model: a note's nearest
 * neighbours have already been filed by the reader, and each one is a vote for its own folder,
 * weighted by how close it is. That means the suggestion improves with every note filed, needs
 * nothing trained, and can always be explained — the neighbours that voted are notes the reader
 * can open and read.
 */

/** A note near the one being placed, and where its reader put it. Unfiled neighbours abstain. */
export type Neighbour = {
  noteId: string;
  folderId: string | null;
  /** Cosine similarity to the note being placed, 0..1. */
  similarity: number;
};

export type Destination = {
  folderId: string;
  /** 0..1 — the share of the vote this folder took, after the reader's history is applied. */
  confidence: number;
  /** The neighbours that argued for it, closest first. This is the answer to "why?". */
  because: string[];
};

export type SuggestOptions = {
  limit?: number;
  /**
   * What the reader has taught echo about suggesting this folder, as a multiplier: 1 leaves the
   * vote alone, below 1 damps a folder they keep rejecting. Corrections may quiet a suggestion the
   * neighbours made; they may never invent one, because the notes are the evidence and history is
   * only a second opinion.
   */
  weightOf?: (folderId: string) => number;
  /** Below this share of the vote, a folder is a coincidence rather than a suggestion. */
  minimumConfidence?: number;
};

/** Under this, one neighbour's vote says more about the threshold than about the note. */
const DEFAULT_MINIMUM = 0.34;

export function suggestDestinations(
  neighbours: Neighbour[],
  { limit = 3, weightOf, minimumConfidence = DEFAULT_MINIMUM }: SuggestOptions = {},
): Destination[] {
  const votes = new Map<string, { weight: number; because: Neighbour[] }>();

  for (const neighbour of neighbours) {
    if (neighbour.folderId === null || neighbour.similarity <= 0) continue;
    const tally = votes.get(neighbour.folderId) ?? { weight: 0, because: [] };
    tally.weight += neighbour.similarity;
    tally.because.push(neighbour);
    votes.set(neighbour.folderId, tally);
  }

  // Shares are taken before the reader's history is applied, so damping one folder cannot promote
  // another: a rejected suggestion goes quiet, it does not hand its votes to the runner-up.
  const total = [...votes.values()].reduce((sum, tally) => sum + tally.weight, 0);
  if (total === 0) return [];

  return [...votes.entries()]
    .map(([folderId, tally]) => ({
      folderId,
      confidence: (tally.weight / total) * (weightOf?.(folderId) ?? 1),
      because: tally.because
        .sort((a, b) => b.similarity - a.similarity || a.noteId.localeCompare(b.noteId))
        .map((neighbour) => neighbour.noteId),
    }))
    .filter((destination) => destination.confidence >= minimumConfidence)
    .sort((a, b) => b.confidence - a.confidence || a.folderId.localeCompare(b.folderId))
    .slice(0, limit);
}
