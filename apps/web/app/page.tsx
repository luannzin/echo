"use client";

import type { Note } from "@echo/types";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composer } from "@/components/notes/composer";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { Stream } from "@/components/notes/stream";
import { AppShell, Pane } from "@/components/shell/app-shell";
import { getEcho } from "@/lib/echo";
import { flipFrom } from "@/lib/flip";

type View = "home" | "stream";

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("home");
  const [editingId, setEditingId] = useState<string | null>(null);
  const composerOrigin = useRef<DOMRect | null>(null);

  // Opens the local database, loads the notes, and keeps the list in step with domain events.
  // ponytail: every event reloads the whole list. Fine to a few hundred notes; virtualize later.
  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};

    getEcho()
      .then(async (echo) => {
        const refresh = async () => {
          const list = await echo.notes.list();
          if (alive) setNotes(list);
        };
        unsubscribe = echo.events.subscribe(() => void refresh());
        await refresh();
        if (alive) setLoading(false);
      })
      .catch(() => alive && setFailed(true));

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  // The composer is re-created when the view changes, so it travels from wherever it just was.
  useLayoutEffect(() => {
    const origin = composerOrigin.current;
    composerOrigin.current = null;
    const element = document.getElementById("composer-shell");
    if (origin && element) flipFrom(element, origin);
  }, [view]);

  const editing = notes.find((note) => note.id === editingId) ?? null;

  /** Writing is never gated on the list finishing its load, so this waits on the database itself. */
  async function capture(content: string) {
    const echo = await getEcho();
    const note = await echo.notes.create({ content });
    if (view === "home") changeView("stream");
    return note;
  }

  // Stable identity: a new function every render would re-run the editor's autosave effects, and
  // re-running them is how a pending write used to escape onto the wrong note.
  const save = useCallback(async (noteId: string, content: string) => {
    const echo = await getEcho();
    await echo.notes.saveContent(noteId, content);
  }, []);

  /** Every view change travels the same way: measure the composer, then let FLIP carry it. */
  function changeView(next: View) {
    setEditingId(null);
    if (next !== view) {
      composerOrigin.current =
        document.getElementById("composer-shell")?.getBoundingClientRect() ?? null;
    }
    setView(next);
  }

  return (
    <AppShell
      atHome={view === "home" && editing === null}
      onHome={() => changeView("home")}
      showNavigation={view === "home"}
      view={view}
      onViewChange={changeView}
      streamAvailable={notes.length > 0}
      navigation={
        <NoteList
          notes={notes}
          loading={loading}
          failed={failed}
          selectedId={editingId}
          onSelect={setEditingId}
        />
      }
      workspace={
        editing ? (
          <NoteEditor
            key={editing.id}
            note={editing}
            onSave={save}
            onClose={() => setEditingId(null)}
          />
        ) : view === "stream" ? (
          // The composer scrolls inside the stream rather than beside it: sharing one scroll
          // container is what keeps both columns exactly the same width.
          <div
            data-stream-scroll
            className="h-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_20px)]"
          >
            <Stream notes={notes} onEdit={setEditingId} />
            <div className="sticky bottom-0 bg-background pt-2">
              <Composer onCapture={capture} docked />
            </div>
          </div>
        ) : (
          <Composer onCapture={capture} />
        )
      }
      intelligence={
        <Pane title="Intelligence">
          <p>Related notes, detected tasks and suggested destinations surface here as you write.</p>
        </Pane>
      }
    />
  );
}
