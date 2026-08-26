import type { Note } from "@echo/types";

/** True while the reader is holding a selection — the click that ends a drag is not a click. */
export const selecting = (): boolean => {
  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().trim().length > 0;
};

/**
 * A note keeps its place in the stream by when it was written, but the note list is ordered by when
 * it was last touched. Showing both stamps is what makes those two orders agree.
 */
export const wasEdited = (note: Note): boolean =>
  note.updatedAt.getTime() - note.createdAt.getTime() > 60_000;
