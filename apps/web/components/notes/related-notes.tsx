"use client";

import type { Note } from "@echo/types";
import { Skeleton } from "@/components/ui/skeleton";

export type Related = { note: Note; semantic: number };

/**
 * What echo remembers about what you are writing. Silence is a valid answer: showing weak matches
 * would teach the writer to ignore this panel.
 */
export function RelatedNotes({
  related,
  analyzing,
  unavailable,
  onOpen,
}: {
  related: Related[];
  /** Notes still waiting to be embedded, so "nothing related" may just mean "not yet". */
  analyzing: number;
  /** The model could not be loaded. Silence here would read as "no matches", which is not true. */
  unavailable: boolean;
  onOpen: (noteId: string) => void;
}) {
  if (unavailable && related.length === 0) {
    return (
      <p>
        Related notes need the local model, which could not be loaded. Everything else — writing,
        saving, search by words — works without it.
      </p>
    );
  }

  if (analyzing > 0 && related.length === 0) {
    return (
      <div className="space-y-3 pt-1">
        <p className="text-muted-foreground text-sm">Reading your notes… {analyzing} to go.</p>
        {[80, 60].map((width) => (
          <Skeleton key={width} className="h-4" style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  }

  if (related.length === 0) {
    return <p>Related notes appear here once you have written something they connect to.</p>;
  }

  return (
    <ul className="space-y-1">
      {related.map(({ note, semantic }) => (
        <li key={note.id}>
          <button
            type="button"
            onClick={() => onOpen(note.id)}
            className="w-full rounded-md px-2 py-2 text-start transition-colors duration-150 hover:bg-sidebar-accent/60"
          >
            <span className="flex items-baseline gap-2">
              <span className="truncate text-foreground text-sm">{note.title || "Untitled"}</span>
              <span className="ms-auto font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                {Math.round(semantic * 100)}%
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-5">
              {note.content}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
