import { extractKeywords } from "@echo/parser";
import type { Note } from "@echo/types";
import { startOfDay } from "./temporal";

/**
 * The reader's own history, compressed. The stream is every note in order; this is one row per day
 * carrying what that day was about — which is the difference between scrolling back through six
 * weeks and seeing them.
 *
 * Pure: notes in, days out. Nothing here reads a database or knows what a component is.
 */

export type TimelineDay = {
  /** Midnight local — the key the day is grouped under. */
  date: Date;
  /** Newest first inside the day, matching how the notes themselves are ordered. */
  noteIds: string[];
  /**
   * What the day was about. The reader's own categories where the notes carry them, and the words
   * the notes used where they do not, so a day is never blank just because nothing was labelled.
   */
  concepts: string[];
};

export type TimelineOptions = {
  /** A note's categories, by name. Absent or empty falls back to the words the note used. */
  conceptsOf?: (noteId: string) => readonly string[];
  /** How many concepts a day may carry before the row stops being readable at a glance. */
  conceptLimit?: number;
};

const DEFAULT_CONCEPT_LIMIT = 3;

const key = (date: Date): number => startOfDay(date).getTime();

/**
 * Days newest first, each with the notes written on it. The spine is `createdAt`: when the thought
 * was had, not when the note was last touched — a typo fixed today does not move a decision made in
 * June to today.
 */
export const buildTimeline = (
  notes: readonly Note[],
  { conceptsOf, conceptLimit = DEFAULT_CONCEPT_LIMIT }: TimelineOptions = {},
): TimelineDay[] => {
  const days = new Map<number, Note[]>();
  for (const note of notes) {
    const at = key(note.createdAt);
    const held = days.get(at);
    if (held) held.push(note);
    else days.set(at, [note]);
  }

  return [...days.entries()]
    .sort(([a], [b]) => b - a)
    .map(([at, written]) => {
      const inOrder = [...written].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
      );
      return {
        date: new Date(at),
        noteIds: inOrder.map((note) => note.id),
        concepts: conceptsFor(inOrder, conceptsOf, conceptLimit),
      };
    });
};

/**
 * Labels first, because they are what the reader said the notes were about. Ties break on the name
 * so a day always reads the same way — derived data has to be reproducible.
 */
const conceptsFor = (
  notes: readonly Note[],
  conceptsOf: ((noteId: string) => readonly string[]) | undefined,
  limit: number,
): string[] => {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const concept of conceptsOf?.(note.id) ?? []) {
      counts.set(concept, (counts.get(concept) ?? 0) + 1);
    }
  }

  if (counts.size > 0) {
    return [...counts.entries()]
      .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB))
      .slice(0, limit)
      .map(([name]) => name);
  }

  // Titles rather than whole notes: a day's headings say what it was about, and reading every body
  // to label a row nobody has clicked is work nobody asked for.
  return extractKeywords(notes.map((note) => note.title).join("\n"), limit);
};
