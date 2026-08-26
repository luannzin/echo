"use client";

import type { Note } from "@echo/types";
import { ArrowUpRight } from "lucide-react";
import { Fragment, memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDay, formatExact, formatStamp, sameDay } from "@/lib/time";

/**
 * The writing stream: everything captured, oldest first, the way it was written. One column, one
 * width — a record of thinking, not a chat. Notes stay whole here.
 */
export const Stream = memo(function Stream({
  notes,
  arrivedId,
  previewId,
  onOpen,
}: {
  notes: Note[];
  /** The note just written, briefly lit so the eye can follow where it landed. */
  arrivedId: string | null;
  /** A note being pointed at somewhere else — the list — which this view brings into view. */
  previewId: string | null;
  /** The row travels with the request: it is the shape the editor grows out of. */
  onOpen: (noteId: string, from: HTMLElement) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const settled = useRef(false);
  const count = notes.length;

  // A new note lands at the bottom, so the view follows it there. The composer is the last thing
  // in this scroller, so scrolling the container beats scrolling a sentinel into view.
  //
  // Twice: rows off screen are laid out from an estimate until the browser has actually seen them
  // (`content-visibility` below), so the first scroll lands close and the second — after that paint,
  // with the real heights known — lands exactly.
  useEffect(() => {
    const scroller = bottom.current?.closest("[data-stream-scroll]");
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    const frame = requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
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

  // Reversed once per change of the list rather than once per render — the composer re-renders this
  // view's parent on every keystroke, and copying the whole notebook to answer a keystroke is work
  // nobody asked for.
  const chronological = useMemo(() => [...notes].reverse(), [notes]);

  return (
    // One provider for the whole column: once a date has been read, the next one answers instantly
    // rather than making the reader wait out the delay again.
    <TooltipProvider>
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="sr-only">Your notes</h1>
        {chronological.map((note, index) => {
          const previous = chronological[index - 1];
          return (
            <Fragment key={note.id}>
              {previous === undefined || !sameDay(note.createdAt, previous.createdAt) ? (
                <p className="pt-6 pb-2 font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em] first:pt-0">
                  {formatDay(note.createdAt)}
                </p>
              ) : null}
              <Row
                note={note}
                targeted={note.id === previewId}
                arrived={note.id === arrivedId}
                delay={settled.current ? 0 : Math.min(index, 8) * 28}
                onOpen={onOpen}
                register={(element) => {
                  if (element) rows.current.set(note.id, element);
                  else rows.current.delete(note.id);
                }}
              />
            </Fragment>
          );
        })}
        <div ref={bottom} />
      </div>
    </TooltipProvider>
  );
});

/**
 * One note in the stream.
 *
 * Memoized per note, because the two things that change most often here — the pointer moving down
 * the column, and a note arriving — change one row at a time. Without this, resting the pointer on
 * a row re-rendered every other row in the notebook to tell them all that they are still not the
 * one being pointed at.
 */
const Row = memo(function Row({
  note,
  targeted,
  arrived,
  delay,
  onOpen,
  register,
}: {
  note: Note;
  targeted: boolean;
  arrived: boolean;
  delay: number;
  onOpen: (noteId: string, from: HTMLElement) => void;
  register: (element: HTMLElement | null) => void;
}) {
  return (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard path is the button inside the row,
      which carries the accessible name and handles Enter and Space. Duplicating it as a key handler
      here would make the row a second tab stop. */
    <article
      data-note-id={note.id}
      ref={register}
      data-targeted={targeted ? "true" : undefined}
      style={{
        animationDelay: `${delay}ms`,
        // Off screen, the browser is told it may skip this row entirely and to assume it is about
        // the height of a short note until it has seen it for real. A notebook of two thousand notes
        // is two thousand rows in the document either way — this is what stops it being two thousand
        // rows of layout and paint on every scroll.
        contentVisibility: "auto",
        containIntrinsicSize: "auto 116px",
      }}
      // The row is the target: reading a note and opening it are the same gesture. Dragging
      // across it to copy a line is not, so a click that ends a selection is left alone.
      onClick={(event) => {
        if (selecting()) return;
        onOpen(note.id, event.currentTarget);
      }}
      // The pointer moves a target down the stream: the row under it lights up, and nothing
      // else does. Focus does the same thing, so the target is not something only a mouse
      // can move.
      //
      // Nothing rules the rows apart — the highlight is the only thing that ever draws a
      // row's edges, and it is a layer of its own rather than the row's background, so it
      // reaches out past the column's gutter by exactly that gutter. A note that just
      // landed borrows the same layer, so arriving and being pointed at look like one thing
      // happening to the row rather than two unrelated colours.
      className={`group relative isolate animate-rise cursor-pointer py-4 before:-inset-x-6 before:-z-10 before:absolute before:inset-y-0 before:rounded-lg before:bg-card/40 before:opacity-0 before:transition-opacity before:duration-150 before:ease-[var(--ease-out-quart)] hover:before:opacity-100 has-[:focus-visible]:before:opacity-100 has-[:focus-visible]:before:ring-1 has-[:focus-visible]:before:ring-ring data-[targeted]:before:opacity-100 ${
        arrived ? "before:animate-arrive-glow" : ""
      }`}
    >
      {/* The keyboard's way in. It covers the row but takes no pointer events, so the mouse
        keeps talking to the row itself and the text stays selectable. */}
      <button
        type="button"
        // The ring belongs on the highlight, which is the shape the reader sees; the box
        // itself is invisible, so its own outline would draw a second, smaller one.
        className="pointer-events-none absolute inset-0 focus-visible:outline-none"
      >
        {/* The exact date is in the name too: a tooltip is a pointer's way of asking, and
          a reader who never touches a mouse is asking the same question. */}
        <span className="sr-only">
          Open {note.title || "note"}, written {formatExact(note.createdAt)}
        </span>
      </button>
      <div className="flex items-baseline gap-2">
        <Stamp date={note.createdAt}>{formatStamp(note.createdAt)}</Stamp>
        {wasEdited(note) ? (
          <Stamp date={note.updatedAt} muted>
            · edited {formatStamp(note.updatedAt)}
          </Stamp>
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
  );
});

/**
 * A relative stamp that answers the obvious follow-up. "3 days ago" is the right thing to read at a
 * glance; "which day, exactly?" is the question that comes next, and resting on it answers that
 * without spending a line of the interface on it.
 */
function Stamp({
  date,
  muted = false,
  children,
}: {
  date: Date;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <time
            dateTime={date.toISOString()}
            className={`cursor-pointer font-mono text-[0.6875rem] uppercase tracking-[0.14em] tabular-nums ${
              muted ? "text-muted-foreground/80" : "text-muted-foreground"
            }`}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side="top">{formatExact(date)}</TooltipPopup>
    </Tooltip>
  );
}

/** True while the reader is holding a selection — the click that ends a drag is not a click. */
function selecting(): boolean {
  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().trim().length > 0;
}

/**
 * A note keeps its place in the stream by when it was written, but the note list is ordered by when
 * it was last touched. Showing both stamps is what makes those two orders agree with each other.
 */
function wasEdited(note: Note): boolean {
  return note.updatedAt.getTime() - note.createdAt.getTime() > 60_000;
}
