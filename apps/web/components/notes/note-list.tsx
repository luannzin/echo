"use client";

import { useEcho } from "@/components/notes/echo-provider";
import { Label } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";

export function NoteList() {
  const { notes, selectedNote, select, createNote, ready, error } = useEcho();

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Label>Notes</Label>
        <Button variant="ghost" size="sm" onClick={createNote} disabled={!ready}>
          New
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {error ? (
          <p className="px-2 text-destructive text-sm">Local database failed to open.</p>
        ) : !ready ? (
          <p className="px-2 text-muted-foreground text-sm">Opening your notes…</p>
        ) : notes.length === 0 ? (
          <p className="px-2 text-muted-foreground text-sm">
            No notes yet. The first one is a keystroke away.
          </p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => select(note.id)}
                  aria-current={note.id === selectedNote?.id ? "true" : undefined}
                  className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    note.id === selectedNote?.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60"
                  }`}
                >
                  {note.title || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
