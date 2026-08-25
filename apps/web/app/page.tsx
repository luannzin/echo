"use client";

import type { Note } from "@echo/types";
import { useEffect, useState } from "react";
import { Composer } from "@/components/notes/composer";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { AppShell, Pane } from "@/components/shell/app-shell";
import { getEcho } from "@/lib/echo";

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = notes.find((note) => note.id === selectedId) ?? null;

  /** Writing is never gated on the list finishing its load, so this waits on the database itself. */
  async function capture(content: string) {
    const echo = await getEcho();
    return echo.notes.create({ content });
  }

  async function save(noteId: string, content: string) {
    const echo = await getEcho();
    await echo.notes.saveContent(noteId, content);
  }

  return (
    <AppShell
      atHome={selected === null}
      onHome={() => setSelectedId(null)}
      navigation={
        <NoteList
          notes={notes}
          loading={loading}
          failed={failed}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      }
      workspace={
        selected ? (
          <NoteEditor note={selected} onSave={save} onClose={() => setSelectedId(null)} />
        ) : (
          <Composer onCapture={capture} onOpen={setSelectedId} />
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
