"use client";

import type { Suggestion } from "@/shared/lib/retrieval";

/** How echo came by each word, in as few words as it takes to be honest about it. */
const REASON: Record<Suggestion["kind"], string> = {
  alias: "you also call it this",
  phrase: "how you usually say it",
  related: "you write it near this",
};

/**
 * The reader's own words for what they just typed. Not a thesaurus and not the model: every one of
 * these came out of a note they wrote — their spellings for it, the phrases they build around it,
 * and what they tend to write beside it.
 */
export const AlsoMean = ({
  suggestions,
  onChoose,
  onReject,
}: {
  suggestions: Suggestion[];
  onChoose: (text: string) => void;
  /** Only aliases can be wrong in a way worth recording — a phrase is quoted, not claimed. */
  onReject: (text: string) => void;
}) => {
  // Nothing to offer is not an empty state; it is a row that does not exist.
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
      <span className="pe-1 font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.14em]">
        You may also mean
      </span>
      {suggestions.map((suggestion) => (
        <span
          key={`${suggestion.kind}:${suggestion.text}`}
          className="inline-flex items-center rounded-full border border-border text-xs"
        >
          <button
            type="button"
            title={REASON[suggestion.kind]}
            onClick={() => onChoose(suggestion.text)}
            className="rounded-full px-2 py-0.5 outline-none transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          >
            {suggestion.text}
          </button>
          {/* Echo claiming two of your words mean the same thing is the only one of these that can
              be wrong about you rather than merely unhelpful, so it is the only one you can refuse. */}
          {suggestion.kind === "alias" ? (
            <button
              type="button"
              onClick={() => onReject(suggestion.text)}
              aria-label={`These are not the same thing as ${suggestion.text}`}
              className="rounded-e-full pe-1.5 ps-0.5 text-muted-foreground/60 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
};
