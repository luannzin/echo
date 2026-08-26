"use client";

/**
 * What a note is about, read out of the words in it against the words in every other note. Nothing
 * was created and nothing was tagged: a concept exists because the reader keeps writing it.
 *
 * A category is still the reader's stated word and still outranks this — rule 9 — so these are shown
 * quietly, and one press turns a concept into a category when they want it as a real place.
 */
export const Concepts = ({
  concepts,
  onPromote,
  onDismiss,
}: {
  concepts: string[];
  /** Makes this a category the reader owns, and puts it on the note. */
  onPromote: (name: string) => void;
  /** Says echo read the note wrong. The word stays in their vocabulary; it stops labelling this. */
  onDismiss: (name: string) => void;
}) => {
  // A note echo cannot read is a row that does not exist, not a row saying it found nothing.
  if (concepts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="pe-0.5 font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.14em]">
        Concepts
      </span>
      {concepts.map((concept) => (
        <span
          key={concept}
          className="group/concept inline-flex max-w-40 items-center gap-1 rounded-full border border-border/70 border-dashed px-2 py-0.5 text-muted-foreground text-xs"
        >
          <button
            type="button"
            onClick={() => onPromote(concept)}
            title={`Keep "${concept}" as a category`}
            className="inline-flex min-w-0 items-center gap-1 rounded-sm outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* No icon. A plus beside a word small enough to sit in a 12px chip still carries a
                2px stroke, so it reads as a dense mark rather than a small one — louder than the
                concept it is decorating. Hover and the title carry the affordance instead. */}
            <span className="truncate">{concept}</span>
          </button>
          <button
            type="button"
            onClick={() => onDismiss(concept)}
            aria-label={`This note is not about ${concept}`}
            className="-me-0.5 rounded-sm text-muted-foreground/60 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
};
