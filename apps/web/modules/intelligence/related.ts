import type { Note } from "@echo/types";

export type Related = {
  note: Note;
  semantic: number;
  /**
   * Why this note is here, beyond how close it reads — the same project, the same concepts, the
   * same fortnight, the note you always open beside it. Sentences the reader can check, never a
   * score they have to take on trust.
   */
  because: string[];
};
