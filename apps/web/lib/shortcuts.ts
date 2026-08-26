/**
 * The keyboard map, as data. Keeping it here rather than inside a component means the whole map can
 * be read in one place, and the platform question — ⌘ on a Mac, Ctrl everywhere else — is answered
 * once instead of at every call site.
 */
export type Shortcut = "palette" | "search" | "new-note" | "toggle-notes" | "toggle-intelligence";

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
    case "toggle-notes":
      return `${mod} B`;
    case "toggle-intelligence":
      return `${mod} I`;
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
    if (key === "b" && !event.shiftKey) return "toggle-notes";
    if (key === "i" && !event.shiftKey) return "toggle-intelligence";
    return null;
  }

  if (event.shiftKey || event.metaKey || event.ctrlKey) return null;
  if (key === "n" && !writing(event.target)) return "new-note";
  return null;
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
