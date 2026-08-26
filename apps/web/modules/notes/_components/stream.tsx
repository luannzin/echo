"use client";

import type { Note } from "@echo/types";
import { Fragment, memo, useEffect, useMemo, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StreamRow } from "@/modules/notes/_components/stream-row";
import { formatDay, sameDay } from "@/shared/lib/time";

const STAGGER_MS = 28;
const STAGGERED_ROWS = 8;

/**
 * The writing stream: everything captured, oldest first, the way it was written. One column, one
 * width — a record of thinking, not a chat. Notes stay whole here.
 */
export const Stream = memo(
  ({
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
    onOpen: (noteId: string, from: HTMLElement) => void;
  }) => {
    const bottom = useRef<HTMLDivElement>(null);
    const rows = useRef(new Map<string, HTMLElement>());
    const settled = useRef(false);
    const count = notes.length;

    // A new note lands at the bottom, so the view follows it there. Twice: rows off screen are laid
    // out from an estimate until the browser has seen them, so the first scroll lands close and the
    // second — with real heights known — lands exactly.
    useEffect(() => {
      const scroller = bottom.current?.closest("[data-stream-scroll]");
      if (!scroller) return;
      scroller.scrollTop = scroller.scrollHeight;
      const frame = requestAnimationFrame(() => {
        scroller.scrollTop = scroller.scrollHeight;
      });
      return () => cancelAnimationFrame(frame);
    }, [count]);

    // The cascade belongs to the first paint. A note added later is the only thing entering.
    useEffect(() => {
      settled.current = true;
    }, []);

    // Pointing at a note in the list walks the stream to it — but only when it is out of sight, so
    // a note already on screen is never yanked around under the reader's eyes.
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

    // Reversed once per change of the list rather than once per render: the composer re-renders this
    // view's parent on every keystroke, and copying the whole notebook to answer one is wasted work.
    const chronological = useMemo(() => [...notes].reverse(), [notes]);

    const register = (noteId: string) => (element: HTMLElement | null) => {
      if (element) rows.current.set(noteId, element);
      else rows.current.delete(noteId);
    };

    return (
      // One provider for the whole column: once a date has been read, the next answers instantly.
      <TooltipProvider>
        <div className="mx-auto w-full max-w-2xl px-6 py-10">
          <h1 className="sr-only">Your notes</h1>
          {chronological.map((note, index) => {
            const previous = chronological[index - 1];
            const turnsOver =
              previous === undefined || !sameDay(note.createdAt, previous.createdAt);

            return (
              <Fragment key={note.id}>
                {turnsOver ? (
                  <p className="pt-6 pb-2 font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em] first:pt-0">
                    {formatDay(note.createdAt)}
                  </p>
                ) : null}
                <StreamRow
                  note={note}
                  targeted={note.id === previewId}
                  arrived={note.id === arrivedId}
                  delay={settled.current ? 0 : Math.min(index, STAGGERED_ROWS) * STAGGER_MS}
                  onOpen={onOpen}
                  register={register(note.id)}
                />
              </Fragment>
            );
          })}
          <div ref={bottom} />
        </div>
      </TooltipProvider>
    );
  },
);
Stream.displayName = "Stream";
