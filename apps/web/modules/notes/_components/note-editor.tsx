"use client";

import type { Note } from "@echo/types";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Kbd } from "@/components/ui/kbd";
import { SAVE_STATE_LABEL, useAutosave } from "@/modules/notes/autosave";
import { Label } from "@/shared/_components/label";
import { NOTE_SURFACE } from "@/shared/lib/transition";

/**
 * An existing note, open for editing. The caller mounts one editor per note (`key={note.id}`), so a
 * draft can never outlive the note it belongs to — that is what keeps one note's text from being
 * saved onto another.
 */
export const NoteEditor = ({
  note,
  location,
  onSave,
  onClose,
}: {
  note: Note;
  /** Where the note lives, written out: `Work / Authentication`, or `Inbox`. */
  location: string;
  onSave: (noteId: string, content: string) => Promise<void>;
  onClose: () => void;
}) => {
  const { draft, setDraft, state } = useAutosave(note.id, note.content, onSave);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Opening a note means continuing it: the caret belongs after the last character.
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    element.scrollTop = element.scrollHeight;
  }, []);

  return (
    // The far end of the morph: the row you clicked in the stream is this surface, opened out.
    <div
      style={{ viewTransitionName: NOTE_SURFACE }}
      className="mx-auto flex h-full w-full max-w-[68ch] flex-col px-8 py-6"
    >
      <div className="flex h-6 items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="-ms-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-muted-foreground text-xs transition-[color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.97] hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Back to writing
          <Kbd className="ml-1">Esc</Kbd>
        </button>
        {/* Metadata stays secondary: where the note is, said quietly, next to what it is doing. */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate">
            <Label>{location}</Label>
          </span>
          {state === "idle" ? null : (
            <span key={state} className="animate-settle">
              <Label>{SAVE_STATE_LABEL[state]}</Label>
            </span>
          )}
        </div>
      </div>
      <textarea
        ref={textarea}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        aria-label="Note content"
        placeholder="Write anything…"
        spellCheck={false}
        className="mt-5 min-h-0 flex-1 resize-none bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground sm:text-[0.975rem]"
      />
    </div>
  );
};
