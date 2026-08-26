import type { Category, NoteCategory } from "@echo/types";

/** What one note is labelled with, and whether the reader said so or echo read it. */
export type NoteLabels = ReadonlyMap<string, readonly NoteCategory[]>;

/**
 * Every assignment, arranged by the note that carries it. Done once for the whole screen: a stream
 * of two thousand rows must not each go looking through the same flat list.
 */
export const byNote = (assignments: readonly NoteCategory[]): NoteLabels => {
  const grouped = new Map<string, NoteCategory[]>();
  for (const assignment of assignments) {
    const existing = grouped.get(assignment.noteId);
    if (existing) existing.push(assignment);
    else grouped.set(assignment.noteId, [assignment]);
  }
  return grouped;
};

/** How many notes carry each category. */
export const countByCategory = (
  assignments: readonly NoteCategory[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    counts.set(assignment.categoryId, (counts.get(assignment.categoryId) ?? 0) + 1);
  }
  return counts;
};

/** The categories one note carries, named, in the order they are drawn. */
export const labelsOf = (
  labels: NoteLabels,
  categories: readonly Category[],
  noteId: string,
): { category: Category; source: NoteCategory["source"] }[] => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return (labels.get(noteId) ?? []).flatMap((assignment) => {
    const category = byId.get(assignment.categoryId);
    return category ? [{ category, source: assignment.source }] : [];
  });
};
