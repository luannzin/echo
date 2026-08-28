"use client";

import { useEffect, useRef } from "react";

/**
 * The match the find box is on, drawn behind the writing surface.
 *
 * A textarea's own selection is only painted while the textarea has focus, and while someone is
 * typing into the find box it does not have focus — which is why the match used to appear only once
 * the box was closed. So the highlight is a copy of the text with everything but the match made
 * invisible, and it lines up only because both elements are given the identical `className`. That is
 * the contract: same font, same padding, same wrapping.
 *
 * It also does the scrolling, for the same reason it exists. A browser only scrolls a textarea to a
 * caret it is regaining focus on, and the focus is elsewhere; the mirror, on the other hand, knows
 * where a soft-wrapped line actually ended up, which arithmetic over the line height would not.
 *
 * It is decoration, and hidden from assistive technology entirely: the find box already says which
 * match of how many this is, and that sentence is the announcement.
 */
export const FindMark = ({
  text,
  start,
  end,
  className,
  from,
}: {
  /** The words in the pane right now — the same string the offsets were found in. */
  text: string;
  start: number;
  end: number;
  /** Must be exactly the writing surface's own classes, or the two copies drift apart. */
  className: string;
  /** The surface this shadows: it is scrolled to the match, and followed when the reader scrolls. */
  from: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  const mirror = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLElement>(null);

  // Brings the match on screen, and only when it is not already there: a match two lines down should
  // not throw the page about, and stepping through matches on one screen should hold still.
  useEffect(() => {
    const surface = from.current;
    const found = mark.current;
    if (!surface || !found) return;
    const top = found.offsetTop;
    const bottom = top + found.offsetHeight;
    if (top < surface.scrollTop || bottom > surface.scrollTop + surface.clientHeight) {
      surface.scrollTop = Math.max(0, top - surface.clientHeight / 2);
    }
    if (mirror.current) mirror.current.scrollTop = surface.scrollTop;
  }, [from, start, end, text]);

  useEffect(() => {
    const surface = from.current;
    if (!surface) return;
    const sync = () => {
      if (mirror.current) mirror.current.scrollTop = surface.scrollTop;
    };
    surface.addEventListener("scroll", sync, { passive: true });
    return () => surface.removeEventListener("scroll", sync);
  }, [from]);

  return (
    <div
      ref={mirror}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-transparent ${className}`}
    >
      {text.slice(0, start)}
      {/* Translucent, unlike `::selection`: the words themselves are in the textarea above this
          layer and keep their own colour, so the highlight has to be something they stay legible
          through rather than a block painted over them. */}
      <mark ref={mark} className="rounded-[2px] bg-brand/45 text-transparent">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </div>
  );
};
