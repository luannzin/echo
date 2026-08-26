"use client";

import type { Category, Note } from "@echo/types";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Concepts } from "@/modules/intelligence/_components/concepts";
import { SAVE_STATE_LABEL, useAutosave } from "@/modules/notes/autosave";
import { CategoryChip } from "@/shared/_components/category-chip";
import { CategoryPicker } from "@/shared/_components/category-picker";
import { GhostText } from "@/shared/_components/ghost-text";
import { Label } from "@/shared/_components/label";
import { useCompletion } from "@/shared/lib/completion";
import { NOTE_SURFACE } from "@/shared/lib/transition";

/** Given to the textarea and to the suggestion behind it; they only line up while they agree. */
const WRITING = "min-h-0 flex-1 resize-none bg-transparent text-base leading-7 sm:text-[0.975rem]";

/**
 * An existing note, open for editing. The caller mounts one editor per note (`key={note.id}`), so a
 * draft can never outlive the note it belongs to — that is what keeps one note's text from being
 * saved onto another.
 */
export const NoteEditor = ({
  note,
  location,
  categories,
  labels,
  concepts,
  complete,
  onSave,
  onClose,
  onAddCategory,
  onCreateCategory,
  onRemoveCategory,
  onDismissConcept,
}: {
  note: Note;
  /** Where the note lives, written out: `Work / Authentication`, or `Inbox`. */
  location: string;
  /** Every category there is, for the picker. */
  categories: Category[];
  /** The ones on this note, and whether the reader said so or echo read it. */
  labels: { category: Category; source: "user" | "auto" }[];
  /** What echo reads the note as being about, in the reader's own words. Nothing was tagged. */
  concepts: string[];
  /** Finishes the sentence from the reader's own writing. Absent until the database has opened. */
  complete?: (text: string) => string;
  onSave: (noteId: string, content: string) => Promise<void>;
  onClose: () => void;
  onAddCategory: (noteId: string, categoryId: string) => void;
  onCreateCategory: (noteId: string, name: string) => void;
  onRemoveCategory: (noteId: string, categoryId: string) => void;
  onDismissConcept: (noteId: string, name: string) => void;
}) => {
  const { draft, setDraft, state } = useAutosave(note.id, note.content, onSave);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const completion = useCompletion(textarea, complete);

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
      {/* What the note is about, under where it lives. Both are metadata; only one is a decision
          the reader has to have made in advance. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {labels.map(({ category, source }) => (
          <CategoryChip
            key={category.id}
            name={category.name}
            source={source}
            onRemove={() => onRemoveCategory(note.id, category.id)}
          />
        ))}
        <CategoryPicker
          categories={categories}
          used={new Set(labels.map(({ category }) => category.id))}
          onChoose={(categoryId) => onAddCategory(note.id, categoryId)}
          onCreate={(name) => onCreateCategory(note.id, name)}
        />
      </div>

      {/* Under the labels, and quieter than them: a category is a decision, a concept is a reading.
          Nothing here has to be made before it can be useful. */}
      <div className="mt-2">
        <Concepts
          concepts={concepts}
          onPromote={(name) => onCreateCategory(note.id, name)}
          onDismiss={(name) => onDismissConcept(note.id, name)}
        />
      </div>

      <div className="relative mt-4 flex min-h-0 flex-1 flex-col">
        <GhostText text={draft} suggestion={completion.ghost} className={WRITING} from={textarea} />
        <textarea
          ref={textarea}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            completion.refresh();
          }}
          onSelect={completion.refresh}
          // Escape puts the suggestion away first, and closes the note only when there is none.
          onKeyDown={(event) => {
            if (completion.onKeyDown(event, setDraft)) return;
            if (event.key === "Escape") onClose();
          }}
          aria-label="Note content"
          placeholder="Write anything…"
          spellCheck={false}
          className={`relative ${WRITING} outline-none placeholder:text-muted-foreground`}
        />
      </div>
    </div>
  );
};
