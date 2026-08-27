const KEY = "echo:editor-tabs";
const CLOSED_KEY = "echo:editor-closed";
const ACTIVE_KEY = "echo:editor-active";

/** How far Ctrl Shift T reaches back. Ten is what a browser gives you and nobody asks for eleven. */
const CLOSED_LIMIT = 10;

/**
 * Which notes are open in editor mode, in the order they were opened — and, once someone has
 * dragged one, in the order they put them. Array order is the whole model: there is no separate
 * `openedAt` to disagree with it, and editing a note never moves it, because nothing here reads
 * anything about the note.
 *
 * It is memory of what you had open, so it outlives the window: `localStorage`, per device. The
 * notes themselves are in the database and know nothing about this.
 */
export type Session = readonly string[];

const readIds = (key: string): Session => {
  if (typeof window === "undefined") return [];
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  } catch {
    // Nothing here is worth failing to open the app over.
    return [];
  }
};

const writeIds = (key: string, ids: Session): void => {
  window.localStorage.setItem(key, JSON.stringify(ids));
};

export const readSession = (): Session => readIds(KEY);

export const writeSession = (session: Session): void => writeIds(KEY, session);

/**
 * Which of the open tabs was being written in. Its own key rather than a position in the session,
 * because dragging a tab reorders the session and reordering must not change where you were.
 *
 * Reopening onto the last tab in the strip was only ever right by accident — it is where a new note
 * lands, not where anyone was.
 */
export const readActive = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
};

export const writeActive = (noteId: string): void => {
  window.localStorage.setItem(ACTIVE_KEY, noteId);
};

/**
 * What Ctrl Shift T reaches for: the tabs that were closed, most recent last. Its own key, because
 * it is not what you have open — it is what you had open, and the two are written at different
 * moments.
 *
 * Only a tab with a note behind it is ever remembered. A blank tab nobody typed into has nothing to
 * reopen, and a tab whose note was deleted comes back through Ctrl Z with its note, not through
 * this — reopening one here would be a tab pointing at nothing.
 */
export const readClosed = (): Session => readIds(CLOSED_KEY);

export const rememberClosed = (noteId: string): void => {
  const kept = readClosed().filter((id) => id !== noteId);
  writeIds(CLOSED_KEY, [...kept, noteId].slice(-CLOSED_LIMIT));
};

/** The most recently closed tab, taken off the stack. Null when there is nothing to reopen. */
export const takeClosed = (): string | null => {
  const closed = readClosed();
  const last = closed[closed.length - 1];
  if (last === undefined) return null;
  writeIds(CLOSED_KEY, closed.slice(0, -1));
  return last;
};

/** Opening a note already open is landing on its tab, not making a second one. */
export const openTab = (session: Session, noteId: string): Session =>
  session.includes(noteId) ? session : [...session, noteId];

export const closeTab = (session: Session, noteId: string): Session =>
  session.filter((id) => id !== noteId);

/** Where the keyboard and the closing tab hand focus on: the neighbour to the right, else left. */
export const neighbourOf = (session: Session, noteId: string): string | null => {
  const at = session.indexOf(noteId);
  if (at === -1) return null;
  return session[at + 1] ?? session[at - 1] ?? null;
};

/**
 * Puts the dragged tab where the one it was dropped on is: past it when dragging rightwards, in
 * front of it when dragging left. Which is what makes the last tab reachable — drop on it and you
 * take its place — without a strip of empty space at the end that only exists to be dropped into.
 */
export const moveTab = (session: Session, noteId: string, targetId: string): Session => {
  const from = session.indexOf(noteId);
  const to = session.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return session;

  const without = session.filter((id) => id !== noteId);
  const at = without.indexOf(targetId) + (from < to ? 1 : 0);
  return [...without.slice(0, at), noteId, ...without.slice(at)];
};
