"use client";

import type { Note } from "@echo/types";
import { useEffect, useRef } from "react";
import { SAVE_STATE_LABEL, useAutosave } from "@/modules/notes/autosave";
import { Label } from "@/shared/_components/label";

/**
 * One note, filling whatever it is given — the whole screen, or half of it in a split. No chrome of
 * its own beyond the save state: everything you can do to a note in this mode lives in the header
 * above, and the point of the mode is a page you can write on.
 *
 * A `noteId` with no note behind it is a new note nobody has typed into yet. Nothing is stored for
 * one, which is what keeps toggling into this mode and straight back out from leaving a row behind.
 */
export const EditorPane = ({
  noteId,
  note,
  focused,
  split,
  onSave,
  onFocus,
}: {
  noteId: string;
  /** Missing until the first keystroke makes it real. */
  note: Note | undefined;
  focused: boolean;
  /** Whether anything is beside it — a lone pane has nothing to distinguish itself from. */
  split: boolean;
  onSave: (noteId: string, content: string) => Promise<void>;
  onFocus: () => void;
}) => {
  const { draft, setDraft, state } = useAutosave(noteId, note?.content ?? "", onSave);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Opening a note means continuing it: the caret belongs after the last character.
  useEffect(() => {
    const element = textarea.current;
    if (!element || !focused) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    element.scrollTop = element.scrollHeight;
    // Focus is claimed when this pane becomes the one being written in, not on every render.
  }, [focused]);

  return (
    <section
      aria-label={note?.title || "New note"}
      onFocusCapture={onFocus}
      className={`relative flex min-w-0 flex-col overflow-y-auto transition-colors duration-200 ${
        split && !focused ? "bg-background/40" : ""
      }`}
    >
      {state === "idle" ? null : (
        <span key={state} className="animate-settle absolute end-4 top-3 z-10">
          <Label>{SAVE_STATE_LABEL[state]}</Label>
        </span>
      )}
      <textarea
        ref={textarea}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="Note content"
        placeholder="Write anything…"
        spellCheck={false}
        className="mx-auto min-h-full w-full max-w-[68ch] flex-1 resize-none bg-transparent px-8 py-10 text-base leading-7 outline-none placeholder:text-muted-foreground sm:text-[0.975rem]"
      />
    </section>
  );
};
