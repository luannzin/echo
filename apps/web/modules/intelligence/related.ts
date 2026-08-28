import type { ContextReason } from "@echo/search";
import type { Note } from "@echo/types";

export type Related = {
  note: Note;
  semantic: number;
  /**
   * Why this note is here, beyond how close it reads — the same project, the same concepts, the
   * same fortnight, the note you always open beside it. Things the reader can check, never a score
   * they have to take on trust.
   *
   * Codes, not sentences: `@echo/search` has no language in it, so the words are looked up here.
   */
  because: ContextReason[];
};

/** The code `@echo/search` returns, and the key the dictionary answers it under. */
export const REASON_KEY: Record<
  ContextReason,
  "sameProject" | "coOpened" | "sharedConcepts" | "samePeriod"
> = {
  "same-project": "sameProject",
  "co-opened": "coOpened",
  "shared-concepts": "sharedConcepts",
  "same-period": "samePeriod",
};
