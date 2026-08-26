import type { Observation } from "@echo/types";

/**
 * Which notes this reader reads together.
 *
 * The one thing about a pair of notes that neither note can tell you. Two notes may share no words,
 * no folder and no labels and still be the two you open in the same breath every time — and that is
 * exactly the case where meaning alone puts the wrong one first.
 *
 * Pure: a list of opens in, a count of pairs out.
 */

/** Two notes read inside this of each other were read together. Longer, and a morning is one pair. */
const TOGETHER_MS = 10 * 60 * 1000;

/** Note id → the notes read alongside it → how often. */
export type CoOpens = ReadonlyMap<string, ReadonlyMap<string, number>>;

const bump = (pairs: Map<string, Map<string, number>>, from: string, to: string): void => {
  const held = pairs.get(from) ?? new Map<string, number>();
  held.set(to, (held.get(to) ?? 0) + 1);
  pairs.set(from, held);
};

/**
 * Counted from a window that walks the log rather than from every pair in it: reading a note twice
 * in a session should not make it its own strongest partner, and two notes an hour apart are two
 * sessions.
 *
 * ponytail: the inner loop stops at the window, so this is linear in the log times the opens inside
 * one sitting — a few thousand comparisons for a real reader, and quadratic only for a log where
 * every open landed in the same ten minutes. Bucket by sitting if an import ever produces one.
 */
export const countCoOpens = (
  opens: readonly Observation[],
  { windowMs = TOGETHER_MS }: { windowMs?: number } = {},
): CoOpens => {
  const inOrder = [...opens].sort((a, b) => a.at.getTime() - b.at.getTime());
  const pairs = new Map<string, Map<string, number>>();

  for (const [index, open] of inOrder.entries()) {
    for (let ahead = index + 1; ahead < inOrder.length; ahead++) {
      const other = inOrder[ahead] as Observation;
      if (other.at.getTime() - open.at.getTime() > windowMs) break;
      if (other.subject === open.subject) continue;
      bump(pairs, open.subject, other.subject);
      bump(pairs, other.subject, open.subject);
    }
  }

  return pairs;
};

/**
 * How strongly two notes go together for this reader, 0..1 — measured against the note's own
 * strongest partner rather than against the corpus, so a reader with two hundred opens and one with
 * ten thousand get the same scale.
 */
export const togetherness = (pairs: CoOpens, noteId: string, otherId: string): number => {
  const held = pairs.get(noteId);
  if (!held) return 0;
  const count = held.get(otherId) ?? 0;
  if (count === 0) return 0;
  let strongest = 0;
  for (const seen of held.values()) if (seen > strongest) strongest = seen;
  return strongest === 0 ? 0 : count / strongest;
};
