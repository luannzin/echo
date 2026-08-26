"use client";

import type { Note } from "@echo/types";
import { ArrowUpRight } from "lucide-react";
import { memo } from "react";
import { StreamStamp } from "@/modules/notes/_components/stream-stamp";
import { selecting, wasEdited } from "@/modules/notes/stream-selection";
import { formatExact, formatStamp } from "@/shared/lib/time";

/**
 * One note in the stream. Memoized per note, because the two things that change most often here —
 * the pointer moving down the column and a note arriving — change one row at a time. Every prop is
 * a primitive or a stable callback, which is what lets the memo actually hold.
 */
export const StreamRow = memo(
  ({
    note,
    labels,
    targeted,
    arrived,
    delay,
    onOpen,
  }: {
    note: Note;
    /** What the note is about, already named and joined — a string, so the memo above still holds. */
    labels: string;
    targeted: boolean;
    arrived: boolean;
    delay: number;
    onOpen: (noteId: string, from: HTMLElement) => void;
  }) => (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard path is the button inside the row,
      which carries the accessible name and handles Enter and Space. Duplicating it as a key handler
      here would make the row a second tab stop. */
    <article
      data-note-id={note.id}
      data-targeted={targeted ? "true" : undefined}
      style={{
        animationDelay: `${delay}ms`,
        // Off screen the browser may skip this row entirely and assume a short note's height until
        // it has seen it. Two thousand notes are two thousand rows either way — this is what stops
        // them being two thousand rows of layout and paint on every scroll.
        contentVisibility: "auto",
        containIntrinsicSize: "auto 116px",
      }}
      // The row is the target: reading a note and opening it are the same gesture. Dragging across
      // it to copy a line is not, so a click that ends a selection is left alone.
      onClick={(event) => {
        if (selecting()) return;
        onOpen(note.id, event.currentTarget);
      }}
      // Nothing rules the rows apart — the highlight is the only thing that ever draws a row's
      // edges, and it is a layer of its own, so it reaches past the column's gutter by exactly that
      // gutter. A note that just landed borrows the same layer.
      className={`group relative isolate animate-rise cursor-pointer py-4 before:-inset-x-6 before:-z-10 before:absolute before:inset-y-0 before:rounded-lg before:bg-card/40 before:opacity-0 before:transition-opacity before:duration-150 before:ease-[var(--ease-out-quart)] hover:before:opacity-100 has-[:focus-visible]:before:opacity-100 has-[:focus-visible]:before:ring-1 has-[:focus-visible]:before:ring-ring data-[targeted]:before:opacity-100 ${
        arrived ? "before:animate-arrive-glow" : ""
      }`}
    >
      {/* The keyboard's way in. It covers the row but takes no pointer events, so the mouse keeps
          talking to the row itself and the text stays selectable. The ring belongs on the highlight,
          which is the shape the reader sees. */}
      <button
        type="button"
        className="pointer-events-none absolute inset-0 focus-visible:outline-none"
      >
        <span className="sr-only">
          Open {note.title || "note"}, written {formatExact(note.createdAt)}
        </span>
      </button>
      <div className="flex items-baseline gap-2">
        <StreamStamp date={note.createdAt}>{formatStamp(note.createdAt)}</StreamStamp>
        {wasEdited(note) ? (
          <StreamStamp date={note.updatedAt} muted>
            · edited {formatStamp(note.updatedAt)}
          </StreamStamp>
        ) : null}
        {labels.length > 0 ? (
          <span className="min-w-0 truncate font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em]">
            {labels}
          </span>
        ) : null}
        {/* Says the row opens. The row is the control, so this is a sign, not a stop. */}
        <ArrowUpRight
          aria-hidden="true"
          className="ms-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 ease-[var(--ease-out-quart)] pointer-coarse:opacity-100 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
        />
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-pretty text-base leading-7 sm:text-[0.95rem]">
        {note.content}
      </p>
    </article>
  ),
);
StreamRow.displayName = "StreamRow";
