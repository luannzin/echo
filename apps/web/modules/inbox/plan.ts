import { folderPath } from "@echo/core";
import type { Destination } from "@echo/search";
import type { Folder, Note } from "@echo/types";

/**
 * Where a pile of unfiled notes would go, worked out in one pass and shown before anything moves.
 *
 * Filing fourteen notes wrongly is a far worse afternoon than filing them one at a time, so the plan
 * is a thing the reader reads rather than a thing they undo.
 */

export type FilingGroup = {
  /** `null` is the pile that stays put: echo has nothing to argue for these. */
  folderId: string | null;
  label: string;
  notes: Note[];
};

/** Groups, biggest first, with the notes staying in the Inbox last however many there are. */
export const planFiling = (
  notes: readonly Note[],
  folders: Folder[],
  /** Where each note is bound, or `null` to stay put. */
  folderOf: (noteId: string) => string | null,
): FilingGroup[] => {
  const groups = new Map<string | null, Note[]>();
  for (const note of notes) {
    const folderId = folderOf(note.id);
    const held = groups.get(folderId);
    if (held) held.push(note);
    else groups.set(folderId, [note]);
  }

  return [...groups.entries()]
    .map(([folderId, held]) => ({
      folderId,
      label: folderId === null ? "Staying in the Inbox" : folderPath(folders, folderId),
      notes: held,
    }))
    .sort((a, b) => {
      if (a.folderId === null) return 1;
      if (b.folderId === null) return -1;
      return b.notes.length - a.notes.length || a.label.localeCompare(b.label);
    });
};

/** How many notes the plan would actually move. */
export const movedBy = (plan: readonly FilingGroup[]): number =>
  plan.reduce((total, group) => (group.folderId === null ? total : total + group.notes.length), 0);

/**
 * Why echo thinks a note goes where it does, in sentences rather than a score.
 *
 * The first one is the whole point of item 17: not "these notes are 0.71 similar" but "you usually
 * put React and TypeScript notes there" — the reader's own habit, said back to them in their own
 * words, which is what makes a suggestion something they can agree or disagree with.
 */
export const reasonsFor = ({
  note,
  destination,
  notesIn,
  conceptsOf,
  titleOf,
}: {
  note: Note;
  destination: Destination;
  /** The notes already in the suggested folder. */
  notesIn: readonly Note[];
  conceptsOf: (noteId: string) => readonly string[];
  titleOf: (noteId: string) => string | undefined;
}): string[] => {
  const reasons: string[] = [];

  const here = new Set(conceptsOf(note.id).map((concept) => concept.toLowerCase()));
  const counts = new Map<string, number>();
  for (const filed of notesIn) {
    for (const concept of conceptsOf(filed.id)) {
      if (here.has(concept.toLowerCase())) counts.set(concept, (counts.get(concept) ?? 0) + 1);
    }
  }

  const shared = [...counts.entries()]
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB))
    .slice(0, 2)
    .map(([name]) => name);

  if (shared.length > 0) {
    reasons.push(`you usually put ${shared.join(" and ")} notes there`);
  }

  // The notes that actually argued for it, by name. A reason the reader can open is a reason they
  // can disagree with; a percentage is not.
  for (const noteId of destination.because.slice(0, 2)) {
    const title = titleOf(noteId);
    if (title) reasons.push(`“${title}” is there`);
  }

  return reasons;
};
