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
