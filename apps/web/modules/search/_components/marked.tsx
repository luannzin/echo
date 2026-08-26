import type { ReactNode } from "react";

/**
 * The query's words, marked where they appear. Rendered as text nodes rather than as markup built
 * from the note — a note is the reader's own writing, and is never treated as anything else.
 */
export const Marked = ({ text, terms }: { text: string; terms: string[] }): ReactNode => {
  if (terms.length === 0) return text;

  const haystack = text.toLowerCase();
  /** Which characters belong to a match. Overlapping terms mark the same characters twice. */
  const hit = new Uint8Array(text.length);
  let marked = false;
  for (const term of terms) {
    let at = haystack.indexOf(term);
    while (at !== -1) {
      hit.fill(1, at, at + term.length);
      marked = true;
      at = haystack.indexOf(term, at + term.length);
    }
  }
  if (!marked) return text;

  const parts: ReactNode[] = [];
  let start = 0;
  for (let index = 1; index <= text.length; index++) {
    if (index < text.length && hit[index] === hit[start]) continue;
    const piece = text.slice(start, index);
    parts.push(
      hit[start] === 1 ? (
        // `mark` so a screen reader can say a match is a match, and weighted as well as coloured.
        // No background: a highlighter block through a list of results is louder than the results.
        <mark key={start} className="bg-transparent font-medium text-brand-bright">
          {piece}
        </mark>
      ) : (
        piece
      ),
    );
    start = index;
  }
  return parts;
};
