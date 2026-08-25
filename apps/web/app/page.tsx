"use client";

import { deriveTitle } from "@echo/core";
import { relatedTo } from "@echo/search";
import { DEFAULT_WORKSPACE_ID, type Note } from "@echo/types";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composer } from "@/components/notes/composer";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { type Related, RelatedNotes } from "@/components/notes/related-notes";
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
  const [related, setRelated] = useState<Related[]>([]);
  /** Read by retrieval so a keystroke never triggers another read of every note. */
  const notesRef = useRef<Note[]>([]);
  const [analyzing, setAnalyzing] = useState(0);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const stopWatching = echo.onAnalysis((state) => {
          if (!alive) return;
          setAnalyzing(state.pending);
          setAnalysisFailed(state.failed);
        });
        const previous = unsubscribe;
        unsubscribe = () => {
          previous();
          stopWatching();
        };
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

  notesRef.current = notes;

  /**
   * Pointing at a note waits a moment before the stream follows: sweeping the pointer down the list
   * on the way somewhere else should not drag the view along with it.
   */
  const previewNote = useCallback((noteId: string | null) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (noteId === null) {
      setPreviewId(null);
      return;
    }
    previewTimer.current = setTimeout(() => setPreviewId(noteId), 150);
  }, []);

  const editing = notes.find((note) => note.id === editingId) ?? null;

  /**
   * Related notes are retrieved for whatever is in focus — the open note, or what is being written.
   * Retrieval runs after the keystroke, never in front of it.
   */
  const findRelated = useCallback(async (text: string, excludeNoteId?: string) => {
    if (text.trim().length < 12) {
      setRelated([]);
      return;
    }
    const echo = await getEcho();
    const [embedding, stored] = await Promise.all([echo.embedQuery(text), echo.embeddings.list()]);
    const byId = new Map(notesRef.current.map((note) => [note.id, note]));
    const candidates = stored.flatMap((entry) => {
      const note = byId.get(entry.noteId);
      return note ? [{ note, embedding: entry.values }] : [];
    });
    setRelated(
      relatedTo(embedding, candidates, { excludeNoteId, limit: 4 }).map(({ note, semantic }) => ({
        note,
        semantic,
      })),
    );
  }, []);

  useEffect(() => {
    if (!editing) return;
    void findRelated(editing.content, editing.id);
  }, [editing, findRelated]);

  /**
   * Capture is optimistic all the way: the note exists on screen before the database hears about
   * it. Writing is local, so the write practically always succeeds — and when it does not, the note
   * disappears again and the text comes back to the composer.
   */
  function capture(content: string): Note {
    const now = new Date();
    const note: Note = {
      id: crypto.randomUUID(),
      workspaceId: DEFAULT_WORKSPACE_ID,
      folderId: null,
      title: deriveTitle(content),
      content,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    setNotes((current) => [note, ...current]);
    setArrivedId(note.id);
    if (view === "home") changeView("stream");

    void getEcho()
      .then((echo) => echo.notes.create({ id: note.id, content }))
      .catch(() => setNotes((current) => current.filter((existing) => existing.id !== note.id)));

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
          onPreview={previewNote}
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
            <Stream
              notes={notes}
              arrivedId={arrivedId}
              previewId={previewId}
              onEdit={setEditingId}
            />
            <div className="sticky bottom-0 bg-background pt-2">
              <Composer onCapture={capture} onDraft={findRelated} docked />
            </div>
          </div>
        ) : (
          <Composer onCapture={capture} onDraft={findRelated} />
        )
      }
      intelligence={
        <Pane title="Related">
          <RelatedNotes
            related={related}
            analyzing={analyzing}
            unavailable={analysisFailed}
            onOpen={setEditingId}
          />
        </Pane>
      }
    />
  );
}
