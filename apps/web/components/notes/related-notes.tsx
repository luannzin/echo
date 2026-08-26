"use client";

import type { Note } from "@echo/types";
import { CopyCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type Related = { note: Note; semantic: number };

/**
 * What echo remembers about what you are writing. Silence is a valid answer: showing weak matches
 * would teach the writer to ignore this panel.
 */
export function RelatedNotes({
  related,
  duplicate,
  analyzing,
  unavailable,
  onOpen,
  onDismissDuplicate,
}: {
  related: Related[];
  /** A match close enough that it is probably the same thought, written twice. */
  duplicate: Related | null;
  /** Notes still waiting to be embedded, so "nothing related" may just mean "not yet". */
  analyzing: number;
  /** The model could not be loaded. Silence here would read as "no matches", which is not true. */
  unavailable: boolean;
  onOpen: (noteId: string, from: HTMLElement) => void;
  onDismissDuplicate: (noteId: string) => void;
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
    <div className="space-y-3">
      {duplicate ? (
        // Never merged, never rewritten: echo says what it noticed and the writer decides. Neutral
        // on purpose: blue is rationed to focus and selection, and a notice is neither.
        <Alert className="animate-settle">
          <CopyCheck aria-hidden="true" />
          <AlertTitle>You may have written this before</AlertTitle>
          <AlertDescription>
            <p className="line-clamp-2 text-xs leading-5">{duplicate.note.title || "Untitled"}</p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => onOpen(duplicate.note.id, event.currentTarget)}
              >
                Open it
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismissDuplicate(duplicate.note.id)}
              >
                Not the same
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <ul className="space-y-1">
        {related.map(({ note, semantic }) => (
          <li key={note.id}>
            <button
              type="button"
              data-note-id={note.id}
              onClick={(event) => onOpen(note.id, event.currentTarget)}
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
    </div>
  );
}
