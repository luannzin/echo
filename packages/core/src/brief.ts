import type { Note, Task } from "@echo/types";

/**
 * What a project is, worked out rather than written down.
 *
 * Nobody maintains this. There is no project description to keep current, no summary that goes stale
 * the week after someone writes it — it is derived from the notes every time it is read, so it is
 * either right or the notes are.
 */

export type ProjectBrief = {
  /** How many notes the project holds. */
  count: number;
  /** The latest few, newest first: what you were last doing here. */
  recent: Note[];
  /**
   * What keeps coming up. The reader's stated categories first, because a word they chose outranks
   * one echo read out of the text (rule 9), then the concepts the writing itself is distinctive for.
   */
  themes: string[];
  /** Still open, soonest first. Undated tasks are still tasks and come last. */
  open: Task[];
  /** When the first note landed, and the last. */
  from: Date;
  to: Date;
};

export type BriefOptions = {
  /** The reader's own labels on a note. Stated, so these lead. */
  categoriesOf?: (noteId: string) => readonly string[];
  /** What a body of writing is distinctive for, against the whole corpus. */
  themesOf?: (text: string) => readonly string[];
  recent?: number;
  themes?: number;
  open?: number;
  /** Only the opening of each note goes into the theme read — see below. */
  sampleChars?: number;
};

const DEFAULTS = { recent: 3, themes: 5, open: 4 } as const;

/**
 * ponytail: themes are read from the first slice of each note rather than all of it. A project of
 * four hundred long notes would otherwise concatenate into a megabyte of text on every render, to
 * answer a question its opening paragraphs already answer. Raise it if a project's themes ever come
 * out thin.
 */
const SAMPLE_CHARS = 400;

/** `null` for a project with nothing in it: there is no brief to give, and an empty one is a lie. */
export const buildBrief = (
  notes: readonly Note[],
  tasks: readonly Task[],
  {
    categoriesOf,
    themesOf,
    recent = DEFAULTS.recent,
    themes = DEFAULTS.themes,
    open = DEFAULTS.open,
    sampleChars = SAMPLE_CHARS,
  }: BriefOptions = {},
): ProjectBrief | null => {
  if (notes.length === 0) return null;

  const byNewest = [...notes].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
  );
  const first = byNewest[byNewest.length - 1] as Note;
  const last = byNewest[0] as Note;

  const held = new Set(notes.map((note) => note.id));
  const stillOpen = tasks
    .filter((task) => task.completedAt === null && held.has(task.noteId))
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, open);

  return {
    count: notes.length,
    recent: byNewest.slice(0, recent),
    themes: themesFor(notes, { categoriesOf, themesOf, limit: themes, sampleChars }),
    open: stillOpen,
    from: first.createdAt,
    to: last.createdAt,
  };
};

const themesFor = (
  notes: readonly Note[],
  {
    categoriesOf,
    themesOf,
    limit,
    sampleChars,
  }: {
    categoriesOf?: (noteId: string) => readonly string[];
    themesOf?: (text: string) => readonly string[];
    limit: number;
    sampleChars: number;
  },
): string[] => {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const name of categoriesOf?.(note.id) ?? []) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const stated = [...counts.entries()]
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB))
    .map(([name]) => name);

  // Only as many read concepts as there is room left for. A project the reader has labelled is
  // described in their words; one they have not is described in the words they used.
  const seen = new Set(stated.map((name) => name.toLowerCase()));
  const read = (
    themesOf?.(notes.map((note) => note.content.slice(0, sampleChars)).join("\n")) ?? []
  ).filter((theme) => !seen.has(theme.toLowerCase()));

  return [...stated, ...read].slice(0, limit);
};
