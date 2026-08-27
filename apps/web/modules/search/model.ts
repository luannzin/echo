import type { EmbedderStatus } from "@echo/embeddings";
import type { SearchResult } from "@echo/search";
import type { Note } from "@echo/types";
import type { LucideIcon } from "lucide-react";
import type { SearchPass } from "@/shared/lib/retrieval";

const EXCERPT_LENGTH = 140;
const EXCERPT_LEAD = 24;

export type PaletteCommand = {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Words a reader might type to reach a command whose label they cannot remember. */
  keywords?: string;
  run: () => void;
};

/**
 * One answer to the question, and which signals were available when it was given. Defined by
 * retrieval, re-exported here so the palette and its helpers agree by construction rather than by
 * two declarations that have to be kept the same.
 */
export type { SearchPass } from "@/shared/lib/retrieval";

export type PaletteRow =
  | { value: string; kind: "command"; command: PaletteCommand }
  | { value: string; kind: "note"; result: SearchResult };

export type PaletteGroup = { value: string; items: PaletteRow[] };

/** How this answer was reached, in as few words as it takes to be honest about it. */
export const describePass = (pass: SearchPass | null, model: EmbedderStatus): string => {
  if (pass === null || pass.results.length === 0) return "Searched on this device";
  if (pass.stage === "meaning") return "Words and meaning";
  // The native runtime cannot count its own download, so there is a wait to report and no fraction
  // to report it with. Saying so beats rounding an absence to zero percent.
  if (model.state === "loading")
    return model.progress === undefined
      ? "Words · meaning still arriving"
      : `Words · meaning at ${Math.round(model.progress * 100)}%`;
  if (model.state === "unavailable") return "Words only — the model could not be loaded";
  return "Words · meaning in a moment";
};

/** The words a reader typed, lowercased and stripped of punctuation, longest first. */
export const queryTerms = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1)
    .sort((a, b) => b.length - a.length);

/**
 * The stretch of the note worth showing under its title: the line a query term appears on, or the
 * body's opening when the match was semantic and no word matched at all.
 */
export const excerpt = (note: Note, terms: string[]): string => {
  const [, ...rest] = note.content.split("\n");
  const body = rest.join(" ").trim();
  if (terms.length === 0 || body.length === 0) return body.slice(0, EXCERPT_LENGTH);

  const haystack = body.toLowerCase();
  const at = terms.map((term) => haystack.indexOf(term)).find((index) => index >= 0);
  if (at === undefined) return body.slice(0, EXCERPT_LENGTH);

  // A little room before the match, so it is read in context rather than as a fragment.
  const from = Math.max(0, at - EXCERPT_LEAD);
  return `${from > 0 ? "…" : ""}${body.slice(from, from + EXCERPT_LENGTH)}`;
};

/**
 * With a question typed, notes are the answer and commands are the afterthought. Empty, it is the
 * other way round: nothing has been asked yet, so the palette offers what it can do.
 */
export const groupRows = (
  commands: PaletteCommand[],
  results: SearchResult[],
  query: string,
): PaletteGroup[] => {
  const text = query.trim().toLowerCase();
  const matching = commands.filter(
    (command) =>
      text.length === 0 ||
      `${command.label} ${command.keywords ?? ""}`.toLowerCase().includes(text),
  );

  const notes: PaletteRow[] = results.map((result) => ({
    value: result.note.id,
    kind: "note",
    result,
  }));
  const rows: PaletteRow[] = matching.map((command) => ({
    value: command.id,
    kind: "command",
    command,
  }));

  return (
    text.length > 0
      ? [
          { value: "Notes", items: notes },
          { value: "Commands", items: rows },
        ]
      : [{ value: "Commands", items: rows }]
  ).filter((group) => group.items.length > 0);
};
