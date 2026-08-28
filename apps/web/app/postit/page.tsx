"use client";

import { deriveTitle } from "@echo/core";
import { CornerDownLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type History, record, redo, startHistory, undo } from "@/modules/editor/history";
import { adoptLocale, copy, currentLocale, readLocale } from "@/shared/lib/i18n";
import {
  POSTIT_NOTE,
  POSTIT_OPEN,
  POSTIT_READY,
  POSTIT_WRITE,
  type PostitNote,
  postitTarget,
} from "@/shared/lib/postit";
import { isRedoChord, isUndoChord } from "@/shared/lib/shortcuts";

/** Long enough that a sentence is one save rather than forty, short enough to survive a crash. */
const SAVE_MS = 500;

/**
 * One note, on the desktop, above everything.
 *
 * Its own window and its own route, so nothing here opens the database, loads a model or draws a
 * shell — it is a piece of paper with the note's words on it. The words come from the main window
 * over Tauri's event bus and go back the same way; see `shared/lib/postit.ts` for why.
 */
const PostitPage = () => {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  /** Only to re-render once the language is known: the dictionary itself is a module. */
  const [, setLanguage] = useState(currentLocale);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  /**
   * What Ctrl Z takes back on the sticky note.
   *
   * A controlled textarea has no working undo of its own — the browser reverses its value and React
   * renders the state straight back over it — and this window is the one place a note is being
   * edited while it is out here, so there is nowhere else to reach for the words. Started from the
   * content the moment it arrives, which is the first thing there is to take back to.
   */
  const history = useRef<History | null>(null);
  /**
   * Whether this window is holding the words it was opened with.
   *
   * The window is hidden rather than closed when a note goes back to the app, so the same window
   * is shown again the next time the same note is pinned — and this is what tells a fresh opening
   * from a second answer to an ask already answered. A fresh opening takes the words, because the
   * app has had the note in the meantime and they may have changed. A late answer is ignored,
   * because taking it would drag the caret back to where the words were when the window opened.
   */
  const holding = useRef(false);

  // Its own document, so it runs the same two lines the main window runs: the head script in
  // `layout.tsx` decided the language before anything painted, and this reads it back.
  useEffect(() => {
    const opened = readLocale();
    adoptLocale(opened);
    setLanguage(opened);
  }, []);

  // What the window is for, and the words to put in it. The ask goes out after the listener is up,
  // so an answer that comes back immediately is not missed.
  useEffect(() => {
    const target = postitTarget();
    if (target === null) return;
    setNoteId(target);

    let alive = true;
    let stop = () => {};

    void (async () => {
      const { emit, listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen<PostitNote>(POSTIT_NOTE, (event) => {
        if (event.payload.noteId !== target) return;
        // Once per opening: after this the sticky note is the thing editing this note.
        if (holding.current) return;
        holding.current = true;
        // Where this opening's undo begins, set before the words rather than after them, so there
        // is never a moment with the note on screen and nothing to take back to.
        history.current = startHistory(event.payload.content, event.payload.content.length);
        setText(event.payload.content);
        // The window opened for this one box and there is nothing else in it to take focus from.
        // On a window being shown again the textarea is already mounted and the caret is wherever
        // it was left — on the button that sent the note back.
        requestAnimationFrame(() => area.current?.focus());
      });
      if (!alive) return unlisten();
      stop = unlisten;
      await emit(POSTIT_READY, { noteId: target });
    })();

    return () => {
      alive = false;
      stop();
    };
  }, []);

  const write = useCallback(
    (content: string) => {
      setText(content);
      if (noteId === null) return;
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        void import("@tauri-apps/api/event").then(({ emit }) =>
          emit(POSTIT_WRITE, { noteId, content }),
        );
      }, SAVE_MS);
    },
    [noteId],
  );

  /** Every change a person made, which is the only kind worth being able to take back. */
  const edit = useCallback(
    (content: string, caret: number) => {
      if (history.current !== null) {
        history.current = record(history.current, { text: content, caret }, Date.now());
      }
      write(content);
    },
    [write],
  );

  /** Puts a step on screen, caret and all. */
  const walk = useCallback(
    (next: History | null) => {
      if (next === null) return;
      history.current = next;
      write(next.present.text);
      // After the state has landed: setting the range against the old value drops the caret in the
      // middle of words that are no longer there.
      requestAnimationFrame(() =>
        area.current?.setSelectionRange(next.present.caret, next.present.caret),
      );
    },
    [write],
  );

  /**
   * Back where it came from: the words are handed over first, then the window goes away.
   *
   * Hidden, never closed. GNOME draws the shadow around a window itself rather than leaving it to
   * the window, so an undecorated always-on-top window the compositor fails to let go of on destroy
   * is left on screen as a transparent card with a shadow and nothing inside it — one per note,
   * outliving the application, because by then there is nothing of ours left behind it. Unmapping
   * before destroying does not help; it is the destroy the compositor mishandles. A window that is
   * never destroyed cannot be destroyed wrongly, so this one is put away instead and shown again
   * the next time the same note is pinned.
   *
   * What that costs is one webview held open per note that has been out on the desktop this
   * session, which is the cheaper half of the trade against a desktop nothing can clear.
   */
  const back = useCallback(async () => {
    if (noteId === null) return;
    if (pending.current) clearTimeout(pending.current);
    const [{ emit }, { getCurrentWindow }] = await Promise.all([
      import("@tauri-apps/api/event"),
      import("@tauri-apps/api/window"),
    ]);
    // The words go first: they are the one thing here that cannot be made again.
    await emit(POSTIT_WRITE, { noteId, content: text ?? "" });
    // Let go of them before the window does: what is on screen belongs to the app again, and the
    // next time this window is shown it is being opened afresh rather than uncovered.
    holding.current = false;
    await getCurrentWindow().hide();
    await emit(POSTIT_OPEN, { noteId });
  }, [noteId, text]);

  /** No window chrome to grab, so the corner is the grip a title bar would otherwise give. */
  const resize = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startResizeDragging("SouthEast");
  }, []);

  const title = deriveTitle(text ?? "") || copy().common.newNote;

  return (
    // Paper, not a page: the colour is fixed rather than themed, because this sits on the desktop
    // among other windows and a sticky note that follows the app's theme stops reading as one.
    <div className="fixed inset-0 flex flex-col bg-[#f7d070] font-sans text-[#3a2c05] selection:bg-[#3a2c05]/20">
      <header
        data-tauri-drag-region
        className="flex shrink-0 items-center gap-2 border-[#3a2c05]/10 border-b px-3 py-2"
      >
        <p
          data-tauri-drag-region
          title={title}
          className="min-w-0 flex-1 truncate font-medium text-[0.8125rem]"
        >
          {title}
        </p>
        <button
          type="button"
          onClick={() => void back()}
          aria-label={copy().postit.sendBack}
          title={copy().postit.sendBack}
          className="flex size-6 shrink-0 items-center justify-center rounded text-[#3a2c05]/60 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3a2c05]/40 hover:bg-[#3a2c05]/10 hover:text-[#3a2c05]"
        >
          <CornerDownLeft aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      {text === null ? (
        <p className="px-3 py-2 text-[#3a2c05]/60 text-sm">{copy().postit.waiting}</p>
      ) : (
        <textarea
          ref={area}
          value={text}
          onChange={(event) => edit(event.target.value, event.target.selectionStart)}
          // Always taken from the browser, even with nothing left to take back: its own stack and
          // this one would otherwise disagree about what the note said.
          onKeyDown={(event) => {
            const undoing = isUndoChord(event.nativeEvent);
            if (!undoing && !isRedoChord(event.nativeEvent)) return;
            event.preventDefault();
            if (history.current === null) return;
            walk(undoing ? undo(history.current) : redo(history.current));
          }}
          spellCheck={false}
          placeholder={copy().postit.write}
          aria-label={title}
          className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-[0.8125rem] leading-relaxed outline-none placeholder:text-[#3a2c05]/40"
        />
      )}

      {/*
        Pointer-only on purpose, and it has a keyboard twin already: the window manager's own resize
        keys still work on an undecorated window, and this only spares the reader hunting for the
        one-pixel edge.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onMouseDown={(event) => {
          event.preventDefault();
          void resize();
        }}
        className="absolute end-0 bottom-0 size-4 cursor-nwse-resize bg-[linear-gradient(135deg,transparent_50%,color-mix(in_srgb,#3a2c05_22%,transparent)_50%)]"
      />
    </div>
  );
};

export default PostitPage;
