"use client";

import type { Note } from "@echo/types";
import { Pencil } from "lucide-react";
import { Fragment, memo, useEffect, useRef } from "react";

/**
 * The writing stream: everything captured, oldest first, the way it was written. One column, one
 * width — a record of thinking, not a chat. Notes stay whole here.
 */
export const Stream = memo(function Stream({
  notes,
  arrivedId,
  previewId,
  onEdit,
}: {
  notes: Note[];
  /** The note just written, briefly lit so the eye can follow where it landed. */
  arrivedId: string | null;
  /** A note being pointed at somewhere else — the list — which this view brings into view. */
  previewId: string | null;
  onEdit: (noteId: string) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const settled = useRef(false);
  const count = notes.length;

  // A new note lands at the bottom, so the view follows it there. The composer is the last thing
  // in this scroller, so scrolling the container beats scrolling a sentinel into view.
  useEffect(() => {
    const scroller = bottom.current?.closest("[data-stream-scroll]");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [count]);

  // The cascade belongs to the first paint. A note added later is the only thing entering, so it
  // enters immediately instead of waiting out a queue it was never part of.
  useEffect(() => {
    settled.current = true;
  }, []);

  // Pointing at a note in the list walks the stream to it — but only when it is actually out of
  // sight, so a note already on screen is never yanked around under the reader's eyes.
  useEffect(() => {
    if (!previewId) return;
    const row = rows.current.get(previewId);
    const scroller = row?.closest("[data-stream-scroll]");
    if (!row || !scroller) return;

    const rowBox = row.getBoundingClientRect();
    const viewBox = scroller.getBoundingClientRect();
    if (rowBox.top >= viewBox.top && rowBox.bottom <= viewBox.bottom) return;

    row.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, [previewId]);

  const chronological = [...notes].reverse();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="sr-only">Your notes</h1>
      {chronological.map((note, index) => {
        const previous = chronological[index - 1];
        const startsDay = previous === undefined || !sameDay(note.createdAt, previous.createdAt);
        return (
          <Fragment key={note.id}>
            {startsDay ? (
              <p className="pt-6 pb-2 font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em] first:pt-0">
                {formatDay(note.createdAt)}
              </p>
            ) : null}
            <article
              ref={(element) => {
                if (element) rows.current.set(note.id, element);
                else rows.current.delete(note.id);
              }}
              data-targeted={note.id === previewId ? "true" : undefined}
              style={{ animationDelay: settled.current ? "0ms" : `${Math.min(index, 8) * 28}ms` }}
              // The pointer moves a target down the stream: the row under it lifts out of the page
              // slightly, and its marker appears on the leading edge. Focus does the same thing, so
              // the target is not something only a mouse can move.
              className={`group relative border-border/70 border-b py-4 transition-colors duration-150 ease-[var(--ease-out-quart)] last:border-b-0 hover:bg-card/40 has-[:focus-visible]:bg-card/40 data-[targeted]:bg-card/40 ${
                note.id === arrivedId ? "animate-arrive" : "animate-rise"
              }`}
            >
              <span
                aria-hidden="true"
                // Sits outside the text column, so the target marker never nudges the writing sideways.
                className="-start-3 absolute inset-y-3 w-px origin-center scale-y-0 bg-brand-bright/70 transition-transform duration-200 ease-[var(--ease-out-quart)] group-hover:scale-y-100 group-has-[:focus-visible]:scale-y-100 group-data-[targeted]:scale-y-100"
              />
              <div className="flex items-baseline gap-2">
                <time
                  dateTime={note.createdAt.toISOString()}
                  className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em] tabular-nums"
                >
                  {formatStamp(note.createdAt)}
                </time>
                {wasEdited(note) ? (
                  <time
                    dateTime={note.updatedAt.toISOString()}
                    className="font-mono text-[0.6875rem] text-muted-foreground/80 uppercase tracking-[0.14em] tabular-nums"
                  >
                    · edited {formatStamp(note.updatedAt)}
                  </time>
                ) : null}
                <button
                  type="button"
                  onClick={() => onEdit(note.id)}
                  aria-label={`Edit ${note.title || "note"}`}
                  className="-my-1 ms-auto flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[0.6875rem] text-muted-foreground opacity-0 transition-[opacity,color] duration-150 pointer-coarse:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 hover:text-foreground"
                >
                  <Pencil aria-hidden="true" className="size-3" />
                  Edit
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-pretty text-base leading-7 sm:text-[0.95rem]">
                {note.content}
              </p>
            </article>
          </Fragment>
        );
      })}
      <div ref={bottom} />
    </div>
  );
});

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/**
 * A note keeps its place in the stream by when it was written, but the note list is ordered by when
 * it was last touched. Showing both stamps is what makes those two orders agree with each other.
 */
function wasEdited(note: Note): boolean {
  return note.updatedAt.getTime() - note.createdAt.getTime() > 60_000;
}

/** Recent notes read better as an age; older ones need their date back. */
function formatStamp(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatDay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}
