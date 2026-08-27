import { isDesktopApp } from "@/shared/lib/tauri";

/**
 * A note lifted off the window and onto the desktop: its own always-on-top window, no title bar,
 * dragged and resized by hand, and no way to lose it behind anything.
 *
 * The sticky note never opens the database. PGlite has one writer, and a second window opening the
 * same store is how a local-first app corrupts itself — so the words travel over Tauri's own event
 * bus and the main window stays the only thing that writes. Which is also why pinning a tab closes
 * it: while a note is on the desktop, the sticky note is the one place it is being edited.
 *
 * ponytail: last write wins if the same note is somehow opened in both at once. A tab that pins
 * closes, so getting there means going looking for it.
 */

/** The sticky note asking for the words it was opened with. Payload: `{ noteId }`. */
export const POSTIT_READY = "postit:ready";
/** The main window answering. Payload: `{ noteId, title, content }`. */
export const POSTIT_NOTE = "postit:note";
/** The sticky note handing an edit back to be saved. Payload: `{ noteId, content }`. */
export const POSTIT_WRITE = "postit:write";
/** "Back to echo": the note wants its tab again. Payload: `{ noteId }`. */
export const POSTIT_OPEN = "postit:open";

export type PostitNote = { noteId: string; title: string; content: string };

/** Window labels are `postit-<note id>`, so a note already on the desktop is found, not duplicated. */
const labelFor = (noteId: string) => `postit-${noteId}`;

/** How big a sticky note opens. Small enough to leave beside other work, big enough for a list. */
const SIZE = { width: 320, height: 340 };

/**
 * Puts a note on the desktop, or brings the one that is already there to the front. Resolves false
 * off the desktop app, where there is no second window to open.
 */
export const openPostit = async (noteId: string): Promise<boolean> => {
  if (!isDesktopApp()) return false;

  // Imported here rather than at the top so the web build never loads a bridge to a Rust side that
  // is not there.
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const label = labelFor(noteId);

  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return true;
  }

  const held = new WebviewWindow(label, {
    url: `postit.html#${noteId}`,
    title: "echo",
    width: SIZE.width,
    height: SIZE.height,
    minWidth: 200,
    minHeight: 160,
    resizable: true,
    // The three things that make it a sticky note rather than a window: no chrome to drag it by,
    // never behind anything, and out of the taskbar so it reads as part of the desktop.
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focus: true,
    backgroundColor: "#f5c451",
  });

  return new Promise<boolean>((resolve) => {
    void held.once("tauri://created", () => resolve(true));
    void held.once("tauri://error", () => resolve(false));
  });
};

/** Which note this window is, read off the URL it was opened with. Null in the main window. */
export const postitTarget = (): string | null => {
  if (typeof window === "undefined") return null;
  const id = window.location.hash.slice(1);
  return id.length > 0 ? id : null;
};
