"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { matchesOf } from "@/modules/editor/find";
import { copy } from "@/shared/lib/i18n";
import { numeric } from "@/shared/lib/styles";

/**
 * Find in the note, the way a text editor does it: a box in the corner, a count beside it, Enter
 * for the next one and Escape to put it away.
 *
 * It says which match is the one being looked at and leaves the showing of it to the surface — the
 * caret ends up there too, so closing the box leaves the reader exactly where they were looking.
 */
export const FindBar = ({
  text,
  initial,
  onGo,
  onClose,
}: {
  /** What is being searched: the words in the pane right now, ahead of any save. */
  text: string;
  /** What the box opens with — whatever was selected when Ctrl F was pressed, usually nothing. */
  initial: string;
  /**
   * Puts the surface on a match, or on nothing when the word is not in the note — a highlight left
   * behind on the last word that did match is a lie about what the box says. Must be stable: it is
   * called whenever the active match changes.
   */
  onGo: (at: { start: number; end: number } | null) => void;
  onClose: () => void;
}) => {
  const words = copy().editor;
  const field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initial);
  const [at, setAt] = useState(0);

  const matches = useMemo(() => matchesOf(text, query), [text, query]);
  // Typing narrows the result set, and the cursor into it must never be left past the end.
  const active = matches.length === 0 ? 0 : Math.min(at, matches.length - 1);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  useEffect(() => {
    const start = matches[active];
    onGo(start === undefined ? null : { start, end: start + query.length });
  }, [matches, active, query.length, onGo]);

  const step = useCallback(
    (by: 1 | -1) => {
      if (matches.length === 0) return;
      setAt((current) => {
        const from = Math.min(current, matches.length - 1);
        return (from + by + matches.length) % matches.length;
      });
    },
    [matches.length],
  );

  return (
    // The keys belong to the group, not to the field: Escape closes it from the buttons too.
    <search
      aria-label={words.find}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="absolute end-3 top-2 z-20 flex items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-lg backdrop-blur-sm"
    >
      <input
        ref={field}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          // A new word is a new search: the count restarts at the first match rather than at
          // whatever number the last word happened to be on.
          setAt(0);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          step(event.shiftKey ? -1 : 1);
        }}
        aria-label={words.find}
        placeholder={words.findPlaceholder}
        spellCheck={false}
        className="w-44 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      <span
        aria-live="polite"
        className={`shrink-0 whitespace-nowrap px-1 text-muted-foreground text-xs ${numeric}`}
      >
        {query.length === 0
          ? ""
          : matches.length === 0
            ? words.noMatches
            : words.matchCount(active + 1, matches.length)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={words.findPrevious}
        disabled={matches.length === 0}
        onClick={() => step(-1)}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronUp aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={words.findNext}
        disabled={matches.length === 0}
        onClick={() => step(1)}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronDown aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={words.closeFind}
        onClick={onClose}
        className="shrink-0 text-muted-foreground"
      >
        <X aria-hidden="true" />
      </Button>
    </search>
  );
};
