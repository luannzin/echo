import type { Mention } from "@echo/parser";

/**
 * The half of temporal reading the parser cannot do. "Depois que comecei HEREZE" names a span
 * against something that happened rather than against the clock, and only the corpus knows when
 * that was — so the parser reports the name and this resolves it.
 */

export type Window = { from: Date; to: Date };

/** A name the reader gave something, folded, to when the first note about it was written. */
export type Anchors = ReadonlyMap<string, Date>;

export const foldName = (name: string): string =>
  name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");

/** Earliest wins: a project began when its first note was written, not when its latest was. */
export const buildAnchors = (named: readonly { name: string; at: Date }[]): Anchors => {
  const anchors = new Map<string, Date>();
  for (const { name, at } of named) {
    const key = foldName(name);
    if (key.length === 0) continue;
    const held = anchors.get(key);
    if (!held || at < held) anchors.set(key, at);
  }
  return anchors;
};

/**
 * The parser captures up to three words after "desde", because it cannot tell where the name ends.
 * The longest match the reader has actually named something is the one they meant, so the candidates
 * are tried longest first and an unknown anchor is dropped rather than guessed at.
 */
const anchorDate = (anchor: string, anchors: Anchors): Date | undefined => {
  const words = foldName(anchor).split(" ");
  for (let length = words.length; length > 0; length--) {
    const found = anchors.get(words.slice(0, length).join(" "));
    if (found) return found;
  }
  return undefined;
};

/**
 * One mention with its anchor filled in, or `null` when the corpus has never heard of the name.
 * A span echo cannot place is a span the reader cannot correct, so it is dropped.
 */
export const resolveMention = (mention: Mention, anchors: Anchors): Mention | null => {
  if (mention.anchor === null || mention.anchoredEdge === null) return mention;
  const at = anchorDate(mention.anchor, anchors);
  if (!at) return null;
  return mention.anchoredEdge === "start"
    ? { ...mention, start: at, anchor: mention.anchor }
    : { ...mention, end: at, anchor: mention.anchor };
};

export const resolveMentions = (mentions: readonly Mention[], anchors: Anchors): Mention[] =>
  mentions.flatMap((mention) => {
    const resolved = resolveMention(mention, anchors);
    return resolved ? [resolved] : [];
  });

/** An open edge is unbounded on that side — "before the project" reaches back as far as the notes do. */
export const overlaps = (mention: Mention, window: Window): boolean => {
  const start = mention.start?.getTime() ?? Number.NEGATIVE_INFINITY;
  const end = mention.end?.getTime() ?? Number.POSITIVE_INFINITY;
  return start <= window.to.getTime() && end >= window.from.getTime();
};

export const contains = (window: Window, at: Date): boolean =>
  at.getTime() >= window.from.getTime() && at.getTime() <= window.to.getTime();

const MS = 1;

export const startOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/** Monday, matching how `@echo/parser` reads "semana passada". */
export const startOfWeek = (date: Date): Date => {
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

/** The week today falls in. What a "now" band is a window onto. */
export const currentWeek = (now: Date): Window => {
  const from = startOfWeek(now);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to: new Date(to.getTime() - MS) };
};

/** Notes written inside the span a mention names. The timeline's spine is when a thought was had. */
export const notesInWindow = <T extends { createdAt: Date }>(
  notes: readonly T[],
  window: Window,
): T[] => notes.filter((note) => contains(window, note.createdAt));

/** A mention as a window, with its open edges closed onto the corpus it is being asked about. */
export const windowOf = (mention: Mention, bounds: Window): Window => ({
  from: mention.start ?? bounds.from,
  to: mention.end ?? bounds.to,
});
