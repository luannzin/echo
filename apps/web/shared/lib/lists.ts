/**
 * The two things the screen does to a list it is already holding.
 *
 * Both exist so an edit costs one row rather than a re-read of the workspace: re-asking the database
 * on every autosave was the same answer arrived at expensively.
 */

/**
 * A note put back where it belongs.
 *
 * The note list is ordered by when a note was last touched, so applying that here rather than asking
 * the database again is what keeps a keystroke's autosave from re-reading every note: an edit moves
 * one row, and the screen already knows which one.
 */
export const upsert = <T extends { id: string; updatedAt: Date }>(items: T[], item: T): T[] => {
  const without = items.filter((existing) => existing.id !== item.id);
  const at = without.findIndex((existing) => existing.updatedAt <= item.updatedAt);
  if (at === -1) return [...without, item];
  return [...without.slice(0, at), item, ...without.slice(at)];
};

/** Folders, categories and tasks are small lists kept in the order they arrived in. */
export const replace = <T extends { id: string }>(items: T[], item: T): T[] => {
  const at = items.findIndex((existing) => existing.id === item.id);
  if (at === -1) return [...items, item];
  return [...items.slice(0, at), item, ...items.slice(at + 1)];
};
