"use client";

import { useEffect, useRef } from "react";

/**
 * The rest of the sentence, drawn behind the writing surface in the same type at a lower weight of
 * colour. A textarea cannot hold two colours, so this is a copy of the text with the written part
 * made invisible and the suggestion visible after it — which only lines up because both elements are
 * given the identical `className`. That is the contract: same font, same padding, same wrapping.
 *
 * It is decoration. The words that count are in the textarea, and this is hidden from assistive
 * technology entirely — a screen reader announcing a guess mid-sentence would be an interruption,
 * not a help.
 */
export const GhostText = ({
  text,
  suggestion,
  className,
  from,
}: {
  text: string;
  suggestion: string;
  /** Must be exactly the writing surface's own classes, or the two copies drift apart. */
  className: string;
  /** The surface this shadows, so a scrolled note keeps the suggestion under the caret. */
  from: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  const mirror = useRef<HTMLDivElement>(null);

  // A scrolled textarea and an unscrolled mirror put the suggestion on the wrong line. Synced on
  // every render, because typing scrolls without ever firing a scroll event of its own.
  useEffect(() => {
    if (mirror.current && from.current) mirror.current.scrollTop = from.current.scrollTop;
  });

  useEffect(() => {
    const surface = from.current;
    if (!surface) return;
    const sync = () => {
      if (mirror.current) mirror.current.scrollTop = surface.scrollTop;
    };
    surface.addEventListener("scroll", sync, { passive: true });
    return () => surface.removeEventListener("scroll", sync);
  }, [from]);

  if (suggestion.length === 0) return null;

  return (
    <div
      ref={mirror}
      aria-hidden="true"
      // Muted on the layer, not only on the suggestion: this element exists to say "not your words
      // yet", and inheriting the writing colour by accident is the one way it can lie.
      className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-muted-foreground ${className}`}
    >
      <span className="invisible">{text}</span>
      <span className="text-muted-foreground/55">{suggestion}</span>
    </div>
  );
};
