/**
 * How far back Ctrl Z reaches in one note. Two hundred steps is not a limit anybody types into in a
 * sitting, and a step is a burst of writing rather than a keystroke.
 *
 * ponytail: bounded per note, unbounded in notes visited — a session that opens hundreds of long
 * notes holds their steps until the window closes. Forget a note's history when its tab closes if
 * that ever shows up in a profile.
 */
const DEPTH = 200;

/** A pause this long ends the step being built, so a burst of typing is one press to take back. */
const SETTLE_MS = 450;

/**
 * What was written, where the caret was, and when. The caret is the half of an undo that is usually
 * missed; the time is what lets Ctrl Z be one timeline rather than two — a deleted note and a
 * paragraph you erased are both things that happened, and the one that happened last is the one
 * coming back.
 */
export type Snapshot = { text: string; caret: number; at: number };

export type History = {
  past: readonly Snapshot[];
  future: readonly Snapshot[];
  /** What the surface is showing. */
  present: Snapshot;
  /** True once a step has been landed on by walking, so the next edit starts a fresh one. */
  settled: boolean;
  /** Whether the last edit added characters. Turning from writing to erasing ends the step. */
  growing: boolean;
};

export const startHistory = (text: string, caret: number): History => ({
  past: [],
  future: [],
  present: { text, caret, at: 0 },
  settled: true,
  growing: true,
});

/**
 * Folds an edit into the history. A step is only broken where a person would feel one: after a
 * pause, when the change was bigger than a character (a paste, a selection replaced, a stretch
 * erased), or when writing turned into erasing. Everything else joins the step being built, which
 * is what makes one press take back a word rather than a letter.
 */
export const record = (
  history: History,
  next: { text: string; caret: number },
  now: number,
): History => {
  // Moving the caret is not an edit, and must not make the step look newer than it is.
  if (next.text === history.present.text) {
    return { ...history, present: { ...next, at: history.present.at } };
  }

  const growing = next.text.length > history.present.text.length;
  const step =
    history.settled ||
    now - history.present.at > SETTLE_MS ||
    Math.abs(next.text.length - history.present.text.length) > 1 ||
    growing !== history.growing;

  return {
    past: step ? [...history.past, history.present].slice(-DEPTH) : history.past,
    // Writing after taking something back is a new branch: there is no forward from here.
    future: [],
    present: { ...next, at: now },
    settled: false,
    growing,
  };
};

/**
 * When the edit Ctrl Z would take back was made, or null when this note has nothing to take back.
 * What the caller compares against everything else that has happened.
 */
export const undoableAt = (history: History): number | null =>
  history.past.length === 0 ? null : history.present.at;

/** The step before this one, or null when there is nothing left to take back. */
export const undo = (history: History): History | null => {
  const step = history.past.at(-1);
  if (step === undefined) return null;
  return {
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future],
    present: step,
    // Landing on a step finishes it: the next character typed starts a new one rather than
    // joining whatever was being built when Ctrl Z was pressed.
    settled: true,
    growing: history.growing,
  };
};

export const redo = (history: History): History | null => {
  const [step, ...rest] = history.future;
  if (step === undefined) return null;
  return {
    past: [...history.past, history.present],
    future: rest,
    present: step,
    settled: true,
    growing: history.growing,
  };
};

/**
 * One history per note, kept outside React on purpose. The browser's own undo stack belongs to the
 * textarea element, and this mode remounts that element every time you look at another tab — so
 * native undo is empty the moment you come back to a note, which is exactly when you want it. This
 * outlives the mount.
 *
 * It is a session's memory, not a stored thing: a reload starts over, the way a text editor's does.
 */
const histories = new Map<string, History>();

export const historyOf = (noteId: string, text: string, caret: number): History =>
  histories.get(noteId) ?? startHistory(text, caret);

export const keepHistory = (noteId: string, history: History): void => {
  histories.set(noteId, history);
};
