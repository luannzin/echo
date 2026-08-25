"use client";

import { useEcho } from "@/components/notes/echo-provider";
import { Label } from "@/components/shell/app-shell";

export function NoteList() {
  const { notes, selectedNote, select, ready, error } = useEcho();

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Label>Notes</Label>
        {notes.length > 0 ? (
          <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
            {notes.length}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {error ? (
          <p className="px-2 text-destructive text-sm">Local database failed to open.</p>
        ) : !ready ? (
          <p className="px-2 text-muted-foreground text-sm">Opening your notes…</p>
        ) : notes.length === 0 ? (
          <p className="px-2 text-muted-foreground text-sm leading-relaxed">
            Nothing here yet. Whatever you write lands in this list.
          </p>
        ) : (
          <ul>
            {notes.map((note, index) => (
              <li
                key={note.id}
                className="animate-rise"
                // Stagger only the first screenful; deeper items are already scrolled past.
                style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
              >
                <button
                  type="button"
                  onClick={() => select(note.id)}
                  aria-current={note.id === selectedNote?.id ? "true" : undefined}
                  className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                    note.id === selectedNote?.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
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
