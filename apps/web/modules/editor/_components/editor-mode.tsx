"use client";

import type { Note, Task } from "@echo/types";
import { Columns2, Minimize2, PanelLeft, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorPane } from "@/modules/editor/_components/editor-pane";
import { NoteAside } from "@/modules/editor/_components/note-aside";
import { TabStrip } from "@/modules/editor/_components/tab-strip";
import {
  closeTab,
  moveTab,
  neighbourOf,
  openTab,
  readSession,
  type Session,
  writeSession,
} from "@/modules/editor/session";

/** Long enough that crossing the button on the way somewhere else does not open the aside. */
const HOVER_INTENT_MS = 150;

/**
 * The simpler mode: a page to write on, the notes you have open along the top, and nothing else.
 * It replaces the shell rather than living inside it — a rail that flashes on every toggle is the
 * cost of rendering the full frame just to hide it.
 */
export const EditorMode = ({
  notes,
  tasks,
  categoriesOf,
  loading,
  failed,
  complete,
  onSave,
  onCreate,
  onLeave,
}: {
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
  onLeave: () => void;
}) => {
  const [session, setSession] = useState<Session>([]);
  const [panes, setPanes] = useState<[string | null, string | null]>([null, null]);
  const [focused, setFocused] = useState<0 | 1>(0);
  const [asideOpen, setAsideOpen] = useState(false);
  const intent = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const next = closeTab(session, noteId);
      const replacement = neighbourOf(session, noteId);
      remember(next);
      setPanes((current) => [
        current[0] === noteId ? replacement : current[0],
        current[1] === noteId ? null : current[1],
      ]);
    },
    [session, remember],
  );

  const toggleSplit = useCallback(() => {
    setPanes((current) => {
      if (current[1] !== null) return [current[0], null];
      // Opens onto the tab beside the one being written in, and onto the same note when there is
      // no other — two views of one note is a legitimate thing to want.
      const beside = current[0] === null ? null : (neighbourOf(session, current[0]) ?? current[0]);
      return [current[0], beside];
    });
    setFocused(0);
  }, [session]);

  const hoverOpen = () => {
    if (intent.current) clearTimeout(intent.current);
    intent.current = setTimeout(() => setAsideOpen(true), HOVER_INTENT_MS);
  };
  const cancelHover = () => {
    if (intent.current) clearTimeout(intent.current);
  };

  useEffect(() => () => cancelHover(), []);

  const save = useCallback(
    (noteId: string, content: string) =>
      noteOf(noteId) ? onSave(noteId, content) : onCreate(noteId, content),
    [noteOf, onSave, onCreate],
  );

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
          panes[1] === null ? "grid-cols-1" : "grid-cols-2 divide-x divide-border"
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
                split={panes[1] !== null}
                complete={complete}
                onSave={save}
                onFocus={() => setFocused(0)}
              />
            )}
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
        onDismiss={() => setAsideOpen(false)}
      />
    </div>
  );
};
