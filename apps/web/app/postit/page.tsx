"use client";

import { deriveTitle } from "@echo/core";
import { CornerDownLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { adoptLocale, copy, currentLocale, readLocale } from "@/shared/lib/i18n";
import {
  POSTIT_NOTE,
  POSTIT_OPEN,
  POSTIT_READY,
  POSTIT_WRITE,
  type PostitNote,
  postitTarget,
} from "@/shared/lib/postit";

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
        // Once, and only once: after this the sticky note is the thing editing this note, and a
        // later answer would take the caret back to where the words were when it opened.
        setText((current) => current ?? event.payload.content);
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

  /** Back where it came from: the words are handed over first, then the window goes. */
  const back = useCallback(async () => {
    if (noteId === null) return;
    if (pending.current) clearTimeout(pending.current);
    const [{ emit }, { getCurrentWindow }] = await Promise.all([
      import("@tauri-apps/api/event"),
      import("@tauri-apps/api/window"),
    ]);
    await emit(POSTIT_WRITE, { noteId, content: text ?? "" });
    await emit(POSTIT_OPEN, { noteId });
    await getCurrentWindow().close();
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
          // biome-ignore lint/a11y/noAutofocus: the window opened for this one box, and there is nothing else in it to take focus from
          autoFocus
          value={text}
          onChange={(event) => write(event.target.value)}
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
