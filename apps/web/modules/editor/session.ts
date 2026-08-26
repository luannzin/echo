const KEY = "echo:editor-tabs";

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

export const readSession = (): Session => {
  if (typeof window === "undefined") return [];
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  } catch {
    // Nothing here is worth failing to open the app over.
    return [];
  }
};

export const writeSession = (session: Session): void => {
  window.localStorage.setItem(KEY, JSON.stringify(session));
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
