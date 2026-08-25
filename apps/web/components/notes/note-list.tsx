"use client";

import type { Note } from "@echo/types";
import { Label } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function NoteList({
  notes,
  loading,
  failed,
  selectedId,
  onSelect,
}: {
  notes: Note[];
  loading: boolean;
  failed: boolean;
  selectedId: string | null;
  onSelect: (noteId: string) => void;
}) {
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
        {failed ? (
          <p className="px-2 text-destructive text-sm">Local database failed to open.</p>
        ) : loading ? (
          <LoadingRows />
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
                  onClick={() => onSelect(note.id)}
                  aria-current={note.id === selectedId ? "true" : undefined}
                  className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                    note.id === selectedId
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

/** Placeholder rows match the real row geometry, so nothing shifts when the notes arrive. */
function LoadingRows() {
  return (
    <ul className="space-y-1.5 px-2 pt-1">
      {[70, 45, 60, 35].map((width, index) => (
        <li key={width}>
          <Skeleton
            className="h-4"
            style={{ width: `${width}%`, animationDelay: `${index * 60}ms` }}
          />
        </li>
      ))}
    </ul>
  );
}
