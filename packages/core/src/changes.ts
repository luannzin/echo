import type { Note } from "@echo/types";

/**
 * What arrived while the reader was away. Single-user, so everything here is something they wrote
 * themselves — which is the point: coming back to a project after two weeks, the question is not
 * who changed it but what you had already decided.
 */

export type Change = {
  /** The visit this is measured against. */
  since: Date;
  /** Newest first. */
  notes: Note[];
  /** Concepts that appear in the new notes and appeared in none of the older ones. */
  concepts: string[];
};

export type ChangeOptions = {
  conceptsOf?: (noteId: string) => readonly string[];
  /** How many notes a summary names before it stops being a summary. */
  limit?: number;
};

const DEFAULT_LIMIT = 5;

/**
 * `null` when nothing arrived, so the interface has one thing to test rather than an empty shape to
 * decide whether to render.
 */
export const whatChanged = (
  notes: readonly Note[],
  since: Date | null,
  { conceptsOf, limit = DEFAULT_LIMIT }: ChangeOptions = {},
): Change | null => {
  if (since === null) return null;

  const arrived: Note[] = [];
  const before: Note[] = [];
  for (const note of notes) {
    if (note.createdAt > since) arrived.push(note);
    else before.push(note);
  }
  if (arrived.length === 0) return null;

  const known = new Set(before.flatMap((note) => [...(conceptsOf?.(note.id) ?? [])]));
  const fresh = new Set<string>();
  for (const note of arrived) {
    for (const concept of conceptsOf?.(note.id) ?? []) {
      if (!known.has(concept)) fresh.add(concept);
    }
  }

  return {
    since,
    notes: [...arrived]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, limit),
    concepts: [...fresh].sort((a, b) => a.localeCompare(b)),
  };
};
