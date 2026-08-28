import { folderPath } from "@echo/core";
import type { Destination } from "@echo/search";
import type { Folder, Note } from "@echo/types";
import { compare, copy } from "@/shared/lib/i18n";

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
      label: folderId === null ? copy().inbox.stayingHere : folderPath(folders, folderId),
      notes: held,
    }))
    .sort((a, b) => {
      if (a.folderId === null) return 1;
      if (b.folderId === null) return -1;
      return b.notes.length - a.notes.length || compare(a.label, b.label);
    });
};

/** How many notes the plan would actually move. */
export const movedBy = (plan: readonly FilingGroup[]): number =>
  plan.reduce((total, group) => (group.folderId === null ? total : total + group.notes.length), 0);

/**
 * Why echo thinks a note goes where it does.
 *
 * The first one is the whole point of item 17: not "these notes are 0.71 similar" but "you usually
 * put React and TypeScript notes there" — the reader's own habit, said back to them in their own
 * words, which is what makes a suggestion something they can agree or disagree with.
 *
 * Structure rather than a sentence. Portuguese puts the concepts after the verb and the place at
 * the end, and a reason built here as words could not be moved once it had been built.
 */
export type InboxReason =
  /** The reader's own habit: the concepts this note shares with what is already filed there. */
  | { kind: "habit"; concepts: string[] }
  /** One of the notes that actually argued for the destination, by name. */
  | { kind: "neighbour"; title: string };

/** Stable enough to key a list on: two reasons of a kind never carry the same subject. */
export const reasonKey = (reason: InboxReason): string =>
  reason.kind === "habit" ? `habit:${reason.concepts.join("|")}` : `neighbour:${reason.title}`;
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
}): InboxReason[] => {
  const reasons: InboxReason[] = [];

  const here = new Set(conceptsOf(note.id).map((concept) => concept.toLowerCase()));
  const counts = new Map<string, number>();
  for (const filed of notesIn) {
    for (const concept of conceptsOf(filed.id)) {
      if (here.has(concept.toLowerCase())) counts.set(concept, (counts.get(concept) ?? 0) + 1);
    }
  }

  const shared = [...counts.entries()]
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || compare(nameA, nameB))
    .slice(0, 2)
    .map(([name]) => name);

  if (shared.length > 0) reasons.push({ kind: "habit", concepts: shared });

  // The notes that actually argued for it, by name. A reason the reader can open is a reason they
  // can disagree with; a percentage is not.
  for (const noteId of destination.because.slice(0, 2)) {
    const title = titleOf(noteId);
    if (title) reasons.push({ kind: "neighbour", title });
  }

  return reasons;
};
