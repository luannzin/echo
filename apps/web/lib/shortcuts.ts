/**
 * The keyboard map, as data. Keeping it here rather than inside a component means the whole map can
 * be read in one place, and the platform question — ⌘ on a Mac, Ctrl everywhere else — is answered
 * once instead of at every call site.
 */
export type Shortcut =
  | "palette"
  | "search"
  | "new-note"
  | "organize"
  | "toggle-notes"
  | "toggle-intelligence"
  | "undo-capture";

/** What the reader would call each one, in the notation their own platform uses. */
export function shortcutLabel(shortcut: Shortcut, mac = onMac()): string {
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
    case "undo-capture":
      return `${mod} Z`;
  }
}

/**
 * Which shortcut a key press is, or null for the overwhelming majority of key presses that are
 * simply someone writing. Single-letter shortcuts never fire while text is being typed — a note
 * that starts with "n" is a note, not a command.
 */
export function shortcutFor(event: KeyboardEvent): Shortcut | null {
  if (event.altKey || event.isComposing) return null;
  const modifier = onMac() ? event.metaKey : event.ctrlKey;
  const key = event.key.toLowerCase();

  if (modifier) {
    if (key === "k") return "palette";
    if (key === "f" && event.shiftKey) return "search";
    if (key === "p" && event.shiftKey) return "organize";
    if (key === "b" && !event.shiftKey) return "toggle-notes";
    if (key === "i" && !event.shiftKey) return "toggle-intelligence";
    // Only ever claimed away from written text. Inside a box with words in it, undo means the
    // words — taking that away to undo something else would be the rudest thing echo could do.
    if (key === "z" && !event.shiftKey && !holdingText(event.target)) return "undo-capture";
    return null;
  }

  if (event.shiftKey || event.metaKey || event.ctrlKey) return null;
  if (key === "n" && !writing(event.target)) return "new-note";
  return null;
}

/**
 * True while the event came from a writing surface that currently has something in it. An empty box
 * has no undo history of its own, so the keystroke is free for echo to mean something else by.
 */
function holdingText(target: EventTarget | null): boolean {
  if (!writing(target)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.value.length > 0;
  }
  return true;
}

/** True while the event came from somewhere a person is putting words. */
export function writing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
}

function onMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
}
