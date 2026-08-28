import type { Note } from "@echo/types";

/**
 * Every note in one markdown file, oldest first.
 *
 * One file rather than a folder of them: the browser can only hand over one download without asking
 * forty times, and a single document is the thing a reader can actually read afterwards. Notes are
 * separated by a rule and dated, so the file is a notebook rather than a concatenation.
 *
 * ponytail: a zip, or the desktop's directory picker, would give one file per note. Neither is worth
 * a dependency or a second code path until somebody asks for it.
 */
export const notebook = (notes: readonly Note[], stamp: (date: Date) => string): string =>
  [...notes]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((note) => `<!-- ${stamp(note.createdAt)} -->\n\n${note.content.trim()}\n`)
    .join("\n---\n\n");
