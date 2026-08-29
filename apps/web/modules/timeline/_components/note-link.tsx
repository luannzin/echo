"use client";

import type { Note } from "@echo/types";
import type { ReactNode } from "react";
import { copy } from "@/shared/lib/i18n";

/**
 * A note's title, as the one thing you press to open it.
 *
 * Every list on this view — the brief's recent notes, what changed while you were away, this week's
 * deadlines, and the notes written on a day — is the same gesture, and it was written out four times
 * with the same forty-word class attribute copied along with it. One of the four had already drifted
 * apart from the other three.
 *
 * The row bleeds a gutter into its container (`-mx-2` against `w-[calc(100%+1rem)]`) so the pressed
 * state reaches past the text without the list itself having to be inset.
 *
 * `trailing` is for a list that says something after the title — the reader's own words for a date,
 * in `now-band`. The title gives up its width to it rather than pushing it off the row.
 */
export const NoteLink = ({
  note,
  onOpen,
  trailing,
}: {
  note: Note;
  onOpen: (noteId: string, from: HTMLElement) => void;
  trailing?: ReactNode;
}) => (
  <button
    type="button"
    data-note-id={note.id}
    onClick={(event) => onOpen(note.id, event.currentTarget)}
    className={`-mx-2 flex w-[calc(100%+1rem)] rounded-md px-2 py-1 text-start outline-none transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] ${
      trailing ? "items-baseline gap-3" : "items-center"
    }`}
  >
    <span className={trailing ? "min-w-0 flex-1 truncate text-sm" : "truncate text-sm"}>
      {note.title || copy().common.untitled}
    </span>
    {trailing}
  </button>
);
