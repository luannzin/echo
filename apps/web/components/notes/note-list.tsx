"use client";

import type { Note } from "@echo/types";
import { useId } from "react";
import { Label } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatStamp } from "@/lib/time";

export function NoteList({
  notes,
  loading,
  failed,
  selectedId,
  onSelect,
  onPreview,
}: {
  notes: Note[];
  loading: boolean;
  failed: boolean;
  selectedId: string | null;
  /** The row travels with the request: it is the shape the editor grows out of. */
  onSelect: (noteId: string, from: HTMLElement) => void;
  /** Announces the note under the pointer or focus, so other views can follow along. */
  onPreview: (noteId: string | null) => void;
}) {
  // The list is named by the heading above it rather than by a duplicate label nobody can see.
  const headingId = useId();

  return (
    <section className="flex h-full flex-col" aria-labelledby={headingId}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 id={headingId}>
          <Label>Notes</Label>
        </h2>
        {notes.length > 0 ? (
          <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
            {notes.length}
            <span className="sr-only"> notes</span>
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {failed ? (
          // An error that names no way out is just bad news. This one names two.
          <p role="alert" className="px-2 text-destructive text-sm leading-relaxed">
            Local storage could not be opened. Reload the page, or check that this browser allows
            site data for echo.
          </p>
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
                  data-note-id={note.id}
                  onClick={(event) => onSelect(note.id, event.currentTarget)}
                  onMouseEnter={() => onPreview(note.id)}
                  onMouseLeave={() => onPreview(null)}
                  onFocus={() => onPreview(note.id)}
                  onBlur={() => onPreview(null)}
                  aria-current={note.id === selectedId ? "page" : undefined}
                  // The row truncates, so the full title stays reachable by resting on it. Reading
                  // the whole note is one click away either way.
                  title={note.title || "Untitled"}
                  // Presses down under the pointer. Opening a note is a navigation, and a
                  // navigation that gives nothing back until the next screen arrives feels like a
                  // click that missed.
                  className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar ${
                    note.id === selectedId
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{note.title || "Untitled"}</span>
                  {/* When it was last touched: the list is ordered by it, so it should be visible. */}
                  <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground/80 tabular-nums">
                    {formatStamp(note.updatedAt)}
                  </span>
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
    <>
      <p role="status" className="sr-only">
        Loading your notes…
      </p>
      <ul aria-hidden="true" className="space-y-1.5 px-2 pt-1">
        {[70, 45, 60, 35].map((width, index) => (
          <li key={width}>
            <Skeleton
              className="h-4"
              style={{ width: `${width}%`, animationDelay: `${index * 60}ms` }}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
