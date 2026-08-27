/**
 * The keyboard map as data, so it can be read in one place and the platform question — ⌘ on a Mac,
 * Ctrl everywhere else — is answered once instead of at every call site.
 */
export type Shortcut =
  | "palette"
  | "search"
  | "new-note"
  | "organize"
  | "toggle-notes"
  | "toggle-intelligence"
  | "undo";

export const shortcutLabel = (shortcut: Shortcut, mac = onMac()): string => {
  const mod = mac ? "⌘" : "Ctrl";
  switch (shortcut) {
    case "palette":
      return `${mod} K`;
    case "search":
      return `${mod} ⇧ F`;
    case "new-note":
      return "N";
    case "organize":
      return `${mod} ⇧ P`;
    case "toggle-notes":
      return `${mod} B`;
    case "toggle-intelligence":
      return `${mod} I`;
    case "undo":
      return `${mod} Z`;
  }
};

/**
 * Ctrl Z — or ⌘ Z — wherever it came from. Whether it means the app's last step or the words in the
 * box under the cursor is a question about what just happened, which only the caller knows.
 */
export const isUndoChord = (event: KeyboardEvent): boolean =>
  (onMac() ? event.metaKey : event.ctrlKey) &&
  !event.shiftKey &&
  !event.altKey &&
  event.key.toLowerCase() === "z";

/** The way back from a Ctrl Z. Both spellings, because desktop editors answer both. */
export const isRedoChord = (event: KeyboardEvent): boolean => {
  if (!(onMac() ? event.metaKey : event.ctrlKey) || event.altKey) return false;
  const key = event.key.toLowerCase();
  return (event.shiftKey && key === "z") || (!event.shiftKey && key === "y");
};

/**
 * Which shortcut a key press is, or null for the overwhelming majority that are simply someone
 * writing. Single-letter shortcuts never fire while text is being typed.
 */
export const shortcutFor = (event: KeyboardEvent): Shortcut | null => {
  if (event.altKey || event.isComposing) return null;
  const modifier = onMac() ? event.metaKey : event.ctrlKey;
  const key = event.key.toLowerCase();

  if (modifier) {
    if (key === "k") return "palette";
    if (key === "f" && event.shiftKey) return "search";
    if (key === "p" && event.shiftKey) return "organize";
    if (key === "b" && !event.shiftKey) return "toggle-notes";
    if (key === "i" && !event.shiftKey) return "toggle-intelligence";
    // Inside a box with words in it, undo means the words.
    if (key === "z" && !event.shiftKey && !holdingText(event.target)) return "undo";
    return null;
  }

  if (event.shiftKey || event.metaKey || event.ctrlKey) return null;
  if (key === "n" && !writing(event.target)) return "new-note";
  return null;
};

/** True while the event came from somewhere a person is putting words. */
export const writing = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
};

/** An empty box has no undo history of its own, so the keystroke is free to mean something else. */
const holdingText = (target: EventTarget | null): boolean => {
  if (!writing(target)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.value.length > 0;
  }
  return true;
};

const onMac = (): boolean =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/**
 * Editor mode's own keys, which are a browser's tab keys because that is what the tab strip looks
 * like and looking like something is a promise. They live here rather than in the map above because
 * editor mode replaces the shell: the full app can never run one of these, so listing them beside
 * its commands would be listing things that do not exist.
 *
 * In `bun dev:web` the browser eats Ctrl T and Ctrl W first. Inside Tauri there is no browser chrome
 * to eat them, and editor mode only exists there.
 */
export type EditorShortcut =
  | "new-tab"
  | "reopen-tab"
  | "close-tab"
  | "next-tab"
  | "previous-tab"
  | { nth: number };

export const editorShortcutFor = (event: KeyboardEvent): EditorShortcut | null => {
  if (event.altKey || event.isComposing) return null;
  if (!(onMac() ? event.metaKey : event.ctrlKey)) return null;
  const key = event.key.toLowerCase();

  if (key === "t") return event.shiftKey ? "reopen-tab" : "new-tab";
  if (key === "tab") return event.shiftKey ? "previous-tab" : "next-tab";
  if (event.shiftKey) return null;
  if (key === "w") return "close-tab";
  // 1 through 8 are that tab and 9 is the last one, the way every browser has done it for a decade.
  if (key >= "1" && key <= "9") return { nth: key === "9" ? -1 : Number(key) - 1 };
  return null;
};
