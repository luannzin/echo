import { folderPath } from "@echo/core";
import type { Category, Folder, Note, NoteCategory } from "@echo/types";

/**
 * What the reader has narrowed to, and what that narrowing is called.
 *
 * One selection answers three surfaces (the note list, the timeline's heading, and the project
 * brief), so both halves of it live together rather than being worked out again wherever they are
 * needed. A folder and a category are alternatives, not a pair: choosing one clears the other, and
 * the category wins here only because the caller cannot hold both.
 */
export type Narrowing = {
  folderId: string | undefined;
  categoryId: string | undefined;
};

/** The notes the pane is showing. Everything the reader has written, unless they have narrowed it. */
export const narrow = (
  notes: Note[],
  assignments: NoteCategory[],
  { folderId, categoryId }: Narrowing,
): Note[] => {
  if (categoryId !== undefined) {
    const tagged = new Set(
      assignments
        .filter((assignment) => assignment.categoryId === categoryId)
        .map((assignment) => assignment.noteId),
    );
    return notes.filter((note) => tagged.has(note.id));
  }
  if (folderId === undefined) return notes;
  return notes.filter((note) => note.folderId === folderId);
};

/**
 * The name of what is being looked at, or null for everything the reader has written.
 *
 * A folder is named by its path, because "Notes" three levels down is not the same place as "Notes"
 * at the top and a heading that says only the leaf is a heading that lies once a week.
 */
export const scopeNameOf = (
  folders: Folder[],
  categories: Category[],
  { folderId, categoryId }: Narrowing,
): string | null => {
  if (categoryId !== undefined) {
    return categories.find((category) => category.id === categoryId)?.name ?? null;
  }
  if (folderId !== undefined) return folderPath(folders, folderId) || null;
  return null;
};
