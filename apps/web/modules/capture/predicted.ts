import { adjust, type LearnedRule, ruleFor } from "@echo/learning";
import { suggestCategories } from "@echo/search";
import type { Category } from "@echo/types";
import type { Related } from "@/modules/intelligence/related";
import type { NoteLabels } from "@/shared/lib/categories";

/**
 * Which of the reader's own labels this draft is likely to want, read off the notes it is already
 * near. Nothing here can invent a label the notes did not already carry.
 *
 * A label the reader keeps taking off goes quiet: history is a second opinion, never the evidence.
 */
export const predictedCategories = (
  related: Related[],
  labels: NoteLabels,
  categories: Category[],
  rules: LearnedRule[],
): Category[] => {
  if (related.length === 0 || categories.length === 0) return [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  return suggestCategories(
    related.map(({ note, semantic }) => ({
      noteId: note.id,
      similarity: semantic,
      categoryIds: (labels.get(note.id) ?? []).map((assignment) => assignment.categoryId),
    })),
    { weightOf: (categoryId) => adjust(1, ruleFor(rules, "category", categoryId)) },
  ).flatMap((guess) => byId.get(guess.categoryId) ?? []);
};
