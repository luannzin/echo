"use client";

import { deriveTitle } from "@echo/core";
import type { Note, Task } from "@echo/types";
import { Columns2, Download, Eye, Minimize2, PanelLeft, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorPane } from "@/modules/editor/_components/editor-pane";
import { NoteAside } from "@/modules/editor/_components/note-aside";
import { PreviewPane } from "@/modules/editor/_components/preview-pane";
import { TabStrip } from "@/modules/editor/_components/tab-strip";
import {
  closeTab,
  moveTab,
  neighbourOf,
  openTab,
  readSession,
  rememberClosed,
  type Session,
  takeClosed,
  writeSession,
} from "@/modules/editor/session";
import { saveCopy } from "@/shared/lib/save-copy";
import { editorShortcutFor } from "@/shared/lib/shortcuts";

/** Long enough that crossing the button on the way somewhere else does not open the aside. */
const HOVER_INTENT_MS = 150;

/** How long the header says what just happened before going quiet again. */
const NOTICE_MS = 2600;

/**
 * The simpler mode: a page to write on, the notes you have open along the top, and nothing else.
 * It replaces the shell rather than living inside it — a rail that flashes on every toggle is the
 * cost of rendering the full frame just to hide it.
 */
export const EditorMode = ({
  undoableAt,
  onUndo,
  notes,
  tasks,
  categoriesOf,
  loading,
  failed,
  complete,
  onSave,
  onCreate,
  onDelete,
  onLeave,
}: {
  /**
   * When the app's own next undo step happened — a note deleted, a note just sent. Ctrl Z is one
   * timeline, so the pane compares it against its own last edit and the later of the two wins.
   * Absent when the app has nothing to take back.
   */
  undoableAt: number | undefined;
  /** Takes the app's step back and names it, or null when there was nothing there. */
  onUndo: () => string | null;
  notes: Note[];
  /** Every task there is; a pane shows the one its note produced, when its note produced one. */
  tasks: Task[];
  /** What a note is labelled with, by name. */
  categoriesOf: (noteId: string) => readonly string[];
  /** True until the notes are in memory. A pane may not open before then — see below. */
  loading: boolean;
  failed: boolean;
  /** Finishes the sentence from the reader's own writing. Absent until the database has opened. */
  complete?: (text: string) => string;
  onSave: (noteId: string, content: string) => Promise<void>;
  /** Called with the id the tab already carries, the first time someone types into a new note. */
  onCreate: (noteId: string, content: string) => Promise<void>;
  /** Really deletes. The page owns the undo, so Ctrl Z works from this mode too. */
  onDelete: (note: Note) => void;
  onLeave: () => void;
}) => {
  const [session, setSession] = useState<Session>([]);
  const [panes, setPanes] = useState<[string | null, string | null]>([null, null]);
  const [focused, setFocused] = useState<0 | 1>(0);
  const [asideOpen, setAsideOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  /** What the preview is drawing, and the line it is following. Only fed while it is open. */
  const [watched, setWatched] = useState({ text: "", line: 0 });
  /** Carries when it was said, so saying the same thing twice reads as twice. */
  const [notice, setNotice] = useState<{ text: string; at: number } | null>(null);
  const intent = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The words in the pane right now, ahead of autosave. Kept in a ref rather than in state because
   * only two things read it — the preview, which asks through state, and exporting, which asks at
   * the moment it is pressed — and neither is worth re-rendering the tab strip on every keystroke.
   */
  const live = useRef({ text: "", line: 0 });

  const noteOf = useCallback((noteId: string) => notes.find((note) => note.id === noteId), [notes]);
  const taskOf = useCallback(
    (noteId: string) => tasks.find((task) => task.noteId === noteId),
    [tasks],
  );

  const remember = useCallback((next: Session) => {
    setSession(next);
    writeSession(next);
  }, []);

  const show = useCallback(
    (noteId: string, pane: 0 | 1 = focused) =>
      setPanes((current) => (pane === 0 ? [noteId, current[1]] : [current[0], noteId])),
    [focused],
  );

  const open = useCallback(
    (noteId: string) => {
      remember(openTab(readSession(), noteId));
      show(noteId);
      setAsideOpen(false);
    },
    [remember, show],
  );

  /**
   * A new note is an id and nothing else. It becomes a row the first time someone types into it,
   * under the same id, so the tab never has to be swapped for a different one.
   */
  const create = useCallback(() => {
    const noteId = crypto.randomUUID();
    remember(openTab(readSession(), noteId));
    show(noteId);
  }, [remember, show]);

  // What was open last time, and a blank page when that is nothing.
  useEffect(() => {
    const stored = readSession().filter((id) => id.length > 0);
    if (stored.length === 0) {
      const noteId = crypto.randomUUID();
      setSession([noteId]);
      writeSession([noteId]);
      setPanes([noteId, null]);
      return;
    }
    setSession(stored);
    setPanes([stored[stored.length - 1] ?? null, null]);
  }, []);

  const close = useCallback(
    (noteId: string) => {
      // Only a tab with a note behind it is worth reopening. A blank one has nothing in it, and a
      // deleted note comes back through Ctrl Z carrying its own tab.
      if (noteOf(noteId)) rememberClosed(noteId);

      const remaining = closeTab(session, noteId);
      const replacement = neighbourOf(session, noteId);
      // Closing the last tab leaves a blank page, never an empty window: a keystroke should not be
      // able to shut the application.
      const blank = remaining.length === 0 ? crypto.randomUUID() : null;
      remember(blank === null ? remaining : [blank]);
      setPanes((current) => [
        current[0] === noteId ? (replacement ?? blank) : current[0],
        current[1] === noteId ? null : current[1],
      ]);
    },
    [session, remember, noteOf],
  );

  const reopen = useCallback(() => {
    const noteId = takeClosed();
    if (noteId === null) return;
    open(noteId);
  }, [open]);

  const toggleSplit = useCallback(() => {
    setPreview(false);
    setPanes((current) => {
      if (current[1] !== null) return [current[0], null];
      // Opens onto the tab beside the one being written in, and onto the same note when there is
      // no other — two views of one note is a legitimate thing to want.
      const beside = current[0] === null ? null : (neighbourOf(session, current[0]) ?? current[0]);
      return [current[0], beside];
    });
    setFocused(0);
  }, [session]);

  // Preview and split take the same column, which is honest in a 960px window: two notes and their
  // rendering do not fit beside each other, so asking for one puts the other away.
  const togglePreview = useCallback(() => {
    setPanes((current) => [current[0], null]);
    setFocused(0);
    setPreview((current) => !current);
  }, []);

  const say = useCallback((message: string) => {
    const at = performance.now();
    setNotice({ text: message, at });
    setTimeout(() => setNotice((current) => (current?.at === at ? null : current)), NOTICE_MS);
  }, []);

  const exportCopy = useCallback(async () => {
    const noteId = panes[0];
    if (noteId === null) return;
    const content = live.current.text || (noteOf(noteId)?.content ?? "");
    if (content.trim().length === 0) return;
    try {
      const written = await saveCopy(noteOf(noteId)?.title || deriveTitle(content), content);
      if (written) say("Saved a copy");
    } catch {
      say("The copy could not be written");
    }
  }, [panes, noteOf, say]);

  const hoverOpen = () => {
    if (intent.current) clearTimeout(intent.current);
    intent.current = setTimeout(() => setAsideOpen(true), HOVER_INTENT_MS);
  };
  const cancelHover = () => {
    if (intent.current) clearTimeout(intent.current);
  };

  useEffect(() => () => cancelHover(), []);

  // The tab keys, which are a browser's tab keys. They are claimed from the window rather than from
  // the writing surface, because Ctrl W has to work while the caret is in the middle of a sentence.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = editorShortcutFor(event);
      if (shortcut === null) return;
      event.preventDefault();

      if (shortcut === "new-tab") return create();
      if (shortcut === "reopen-tab") return reopen();
      if (shortcut === "close-tab") {
        if (panes[0] !== null) close(panes[0]);
        return;
      }

      const at = panes[0] === null ? -1 : session.indexOf(panes[0]);
      if (typeof shortcut === "object") {
        const target = shortcut.nth === -1 ? session[session.length - 1] : session[shortcut.nth];
        if (target !== undefined) show(target, 0);
        return;
      }
      if (session.length === 0 || at === -1) return;
      const step = shortcut === "next-tab" ? 1 : -1;
      const target = session[(at + step + session.length) % session.length];
      if (target !== undefined) show(target, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session, panes, create, reopen, close, show]);

  const save = useCallback(
    (noteId: string, content: string) =>
      noteOf(noteId) ? onSave(noteId, content) : onCreate(noteId, content),
    [noteOf, onSave, onCreate],
  );

  const onWrite = useCallback(
    (text: string, line: number) => {
      live.current = { text, line };
      if (preview) setWatched({ text, line });
    },
    [preview],
  );

  const beside = panes[1] !== null || preview;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/*
        The window's title bar, with the tabs in it. `data-tauri-drag-region` only claims the empty
        stretch of the header — a child with its own handler keeps them — so the strip drags the
        window the way a native title bar does, and outside Tauri the attribute means nothing.
      */}
      <header data-tauri-drag-region className="flex shrink-0 items-center gap-2 px-2 pt-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={asideOpen ? "Hide notes" : "Show notes"}
          aria-expanded={asideOpen}
          onClick={() => setAsideOpen((current) => !current)}
          onMouseEnter={hoverOpen}
          onMouseLeave={cancelHover}
          onFocus={cancelHover}
          className="shrink-0 text-muted-foreground"
        >
          <PanelLeft aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New note"
          onClick={create}
          className="shrink-0 text-muted-foreground"
        >
          <Plus aria-hidden="true" />
        </Button>

        <TabStrip
          session={session}
          noteOf={noteOf}
          active={panes[0]}
          secondary={panes[1]}
          onSelect={show}
          onClose={close}
          onMove={(noteId, targetId) => remember(moveTab(session, noteId, targetId))}
        />

        {/* One slot, saying what just happened and then going quiet. Live, because a save dialog
            takes the eye away from the header it will report back to. */}
        <p
          key={notice?.at}
          aria-live="polite"
          className={`shrink-0 whitespace-nowrap text-muted-foreground text-xs transition-opacity duration-200 ${
            notice === null ? "opacity-0" : "animate-settle opacity-100"
          }`}
        >
          {notice?.text}
        </p>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={preview ? "Hide the preview" : "Show the preview"}
          aria-pressed={preview}
          onClick={togglePreview}
          className={`shrink-0 ${preview ? "text-brand-bright" : "text-muted-foreground"}`}
        >
          <Eye aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Save a copy as a file"
          onClick={exportCopy}
          className="shrink-0 text-muted-foreground"
        >
          <Download aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={panes[1] === null ? "Split the view" : "Close the split"}
          aria-pressed={panes[1] !== null}
          onClick={toggleSplit}
          className="shrink-0 text-muted-foreground"
        >
          {panes[1] === null ? <Columns2 aria-hidden="true" /> : <X aria-hidden="true" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to the full app"
          onClick={onLeave}
          className="shrink-0 text-muted-foreground"
        >
          <Minimize2 aria-hidden="true" />
        </Button>
      </header>

      <div
        className={`grid min-h-0 flex-1 border-t ${
          beside ? "grid-cols-2 divide-x divide-border" : "grid-cols-1"
        }`}
      >
        {/*
          Nothing opens until the notes are in memory. A pane takes its text once, when it mounts,
          and a pane that mounted while the database was still opening would take an empty string —
          then autosave would notice the note it belongs to says something different, and write the
          empty string over it. The note is only "new" once there is something to be new against.
        */}
        {loading || failed ? (
          <p
            role={failed ? "alert" : undefined}
            className="px-6 py-5 text-muted-foreground text-sm leading-relaxed"
          >
            {failed
              ? "Local storage could not be opened, so nothing typed here can be kept. Reload, or check that this browser allows site data for echo."
              : null}
          </p>
        ) : (
          <>
            {panes[0] === null ? null : (
              <EditorPane
                key={panes[0]}
                noteId={panes[0]}
                note={noteOf(panes[0])}
                task={taskOf(panes[0])}
                categories={categoriesOf(panes[0])}
                focused={focused === 0}
                split={beside}
                complete={complete}
                onSave={save}
                onFocus={() => setFocused(0)}
                onWrite={onWrite}
                undoableAt={undoableAt}
                onUndo={onUndo}
                onNotice={say}
              />
            )}
            {preview ? <PreviewPane markdown={watched.text} line={watched.line} /> : null}
            {panes[1] === null ? null : (
              <EditorPane
                key={`split:${panes[1]}`}
                noteId={panes[1]}
                note={noteOf(panes[1])}
                task={taskOf(panes[1])}
                categories={categoriesOf(panes[1])}
                focused={focused === 1}
                split
                complete={complete}
                onSave={save}
                onFocus={() => setFocused(1)}
                undoableAt={undoableAt}
                onUndo={onUndo}
                onNotice={say}
              />
            )}
          </>
        )}
      </div>

      <NoteAside
        notes={notes}
        open={asideOpen}
        activeId={panes[0]}
        onOpenNote={open}
        // The tab goes with the note. Undoing the delete puts the note back but not the tab, which
        // is right: a tab is where you were looking, and you were not looking at it when it went.
        onDeleteNote={(note) => {
          close(note.id);
          onDelete(note);
        }}
        onDismiss={() => setAsideOpen(false)}
      />
    </div>
  );
};
