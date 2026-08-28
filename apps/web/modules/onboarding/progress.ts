import type { Note, NoteCategory, Task } from "@echo/types";
import { LOCALE_KEY } from "@/shared/lib/i18n";

/**
 * The five things worth having done once, and how echo knows they are done.
 *
 * **Nothing here keeps its own count.** Every one of these is read back out of the notes, so a
 * reader who wrote four notes before any of this shipped opens the app to a list that is already
 * finished, and a reader who ignores the tour and files a note by hand still gets the tick. A
 * checklist with a private idea of progress is a checklist that can be wrong about your own
 * notebook, which is the one thing it must never be.
 *
 * One of the five cannot be derived, and it is named as the exception rather than hidden among the
 * rest: nothing in the database records that a search was run. `found` is a fact echo writes down
 * when it happens — a thing that happened, not a step in a sequence.
 */
export const MILESTONES = ["wrote", "read", "found", "placed", "settled"] as const;

export type Milestone = (typeof MILESTONES)[number];

/** Where the one underivable milestone is kept. */
const FOUND_KEY = "echo:found-a-note";

/** Recorded when a search actually returns something. Idempotent, and never unset. */
export const rememberFound = (): void => {
  try {
    window.localStorage.setItem(FOUND_KEY, "true");
  } catch {
    // A window with storage denied gets a checklist that forgets. Nothing else depends on it.
  }
};

/** Whether the reader has answered any question about how echo behaves. */
const settled = (): boolean => {
  if (typeof window === "undefined") return false;
  return ["echo:theme", "echo:motion", "echo:storage", LOCALE_KEY].some(
    (key) => window.localStorage.getItem(key) !== null,
  );
};

export type Corpus = {
  notes: readonly Note[];
  tasks: readonly Task[];
  /** Which categories are on which notes, which is one of the two things echo can read. */
  assignments: readonly NoteCategory[];
};

/** Which of the five are true, right now, of this notebook. */
export const reached = ({ notes, tasks, assignments }: Corpus): ReadonlySet<Milestone> => {
  const done = new Set<Milestone>();
  if (notes.length > 0) done.add("wrote");
  // Something echo worked out on its own: a task it read, or a label it put on a note.
  if (tasks.length > 0 || assignments.length > 0) done.add("read");
  if (typeof window !== "undefined" && window.localStorage.getItem(FOUND_KEY) === "true") {
    done.add("found");
  }
  if (notes.some((note) => note.folderId !== null)) done.add("placed");
  if (settled()) done.add("settled");
  return done;
};

/** The next thing to do, or null once there is nothing left. Order is the order they are met in. */
export const nextOf = (done: ReadonlySet<Milestone>): Milestone | null =>
  MILESTONES.find((milestone) => !done.has(milestone)) ?? null;
