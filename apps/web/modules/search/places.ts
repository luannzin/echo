import { buildAnchors, folderPath, type Place } from "@echo/core";
import type { Category, Folder, Note } from "@echo/types";
import type { NoteLabels } from "@/shared/lib/categories";

/**
 * Everywhere the reader has made, so a question can name one — "notes about auth in my Work
 * projects". Folders and categories go in one list because a question does not distinguish them:
 * whoever asked was naming a place, not choosing a mechanism.
 */
export const placesOf = (folders: Folder[], categories: Category[]): Place[] => [
  ...folders.map((folder) => ({
    kind: "folder" as const,
    id: folder.id,
    name: folderPath(folders, folder.id),
  })),
  ...categories.map((category) => ({
    kind: "category" as const,
    id: category.id,
    name: category.name,
  })),
];

/**
 * When each project started, for a question anchored to one — "desde que comecei HEREZE". A project
 * began when its first note was written, so this is the earliest note carrying its name.
 *
 * The names are read into maps first rather than looked up per note: the notes are the list that
 * grows, and a `find` inside this loop is the same mistake the note list already had.
 */
export const anchorsOf = (
  notes: Note[],
  folders: Folder[],
  categories: Category[],
  labels: NoteLabels,
): ReturnType<typeof buildAnchors> => {
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const named: { name: string; at: Date }[] = [];
  for (const note of notes) {
    const folder = note.folderId === null ? undefined : folderNames.get(note.folderId);
    if (folder) named.push({ name: folder, at: note.createdAt });
    for (const assignment of labels.get(note.id) ?? []) {
      const category = categoryNames.get(assignment.categoryId);
      if (category) named.push({ name: category, at: note.createdAt });
    }
  }
  return buildAnchors(named);
};
