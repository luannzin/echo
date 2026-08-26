"use client";

import type { Note } from "@echo/types";
import { useEffect, useRef } from "react";
import { SAVE_STATE_LABEL, useAutosave } from "@/modules/notes/autosave";
import { GhostText } from "@/shared/_components/ghost-text";
import { Label } from "@/shared/_components/label";
import { useCompletion } from "@/shared/lib/completion";

/** Given to the textarea and to the suggestion behind it; they only line up while they agree. */
const WRITING =
  "min-h-full w-full flex-1 resize-none bg-transparent px-6 py-5 text-base leading-7 sm:text-[0.975rem]";

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
  complete,
  onSave,
  onFocus,
}: {
  noteId: string;
  /** Missing until the first keystroke makes it real. */
  note: Note | undefined;
  focused: boolean;
  /** Whether anything is beside it — a lone pane has nothing to distinguish itself from. */
  split: boolean;
  /** Finishes the sentence from the reader's own writing. Absent until the database has opened. */
  complete?: (text: string) => string;
  onSave: (noteId: string, content: string) => Promise<void>;
  onFocus: () => void;
}) => {
  const { draft, setDraft, state } = useAutosave(noteId, note?.content ?? "", onSave);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const completion = useCompletion(textarea, complete);

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
      <div className="relative flex min-h-full flex-1 flex-col">
        <GhostText text={draft} suggestion={completion.ghost} className={WRITING} from={textarea} />
        <textarea
          ref={textarea}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            completion.refresh();
          }}
          onSelect={completion.refresh}
          onKeyDown={(event) => completion.onKeyDown(event, setDraft)}
          aria-label="Note content"
          placeholder="Write anything…"
          spellCheck={false}
          className={`relative ${WRITING} outline-none placeholder:text-muted-foreground`}
        />
      </div>
    </section>
  );
};
