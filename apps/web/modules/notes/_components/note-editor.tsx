"use client";

import type { Category, Note, Task } from "@echo/types";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { NoteMarks } from "@/modules/editor/_components/note-marks";
import { WritingSurface } from "@/modules/editor/_components/writing-surface";
import { Concepts } from "@/modules/intelligence/_components/concepts";
import { saveStateLabel, useAutosave } from "@/modules/notes/autosave";
import { CategoryChip } from "@/shared/_components/category-chip";
import { CategoryPicker } from "@/shared/_components/category-picker";
import { Label } from "@/shared/_components/label";
import { copy } from "@/shared/lib/i18n";
import type { Filing } from "@/shared/lib/slash";
import { NOTE_SURFACE } from "@/shared/lib/transition";

/** Given to the textarea and to the suggestion behind it; they only line up while they agree. */
const WRITING = "min-h-0 flex-1 resize-none bg-transparent text-base leading-7 sm:text-[0.975rem]";

/** How long the header says what just happened before going quiet again. */
const NOTICE_MS = 2600;

/**
 * An existing note, open for editing. The caller mounts one editor per note (`key={note.id}`), so a
 * draft can never outlive the note it belongs to — that is what keeps one note's text from being
 * saved onto another.
 */
export const NoteEditor = ({
  note,
  task,
  location,
  categories,
  labels,
  concepts,
  complete,
  undoableAt,
  onUndo,
  onFile,
  onSave,
  onClose,
  onDelete,
  onAddCategory,
  onCreateCategory,
  onRemoveCategory,
  onDismissConcept,
}: {
  note: Note;
  /** The task this note produced, if it produced one. */
  task: Task | undefined;
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
  /**
   * When the app's own next undo step happened — a note deleted, a note just sent. Ctrl Z is one
   * timeline, so the surface below compares it against its own last edit and the later of the two
   * wins. Absent when the app has nothing to take back.
   */
  undoableAt?: number;
  /** Takes the app's step back and names it, or null when there was nothing there. */
  onUndo?: () => string | null;
  /** Files what a slash command asked for, against a note that is already in the database. */
  onFile?: (noteId: string, ask: Filing) => Promise<void>;
  onSave: (noteId: string, content: string) => Promise<void>;
  onClose: () => void;
  /** Really deletes, and closes behind itself. Ctrl Z is the way back. */
  onDelete: (note: Note) => void;
  onAddCategory: (noteId: string, categoryId: string) => void;
  onCreateCategory: (noteId: string, name: string) => void;
  onRemoveCategory: (noteId: string, categoryId: string) => void;
  onDismissConcept: (noteId: string, name: string) => void;
}) => {
  const words = copy().notes;
  const { draft, setDraft, state } = useAutosave(note.id, note.content, onSave);
  /** Carries when it was said, so saying the same thing twice reads as twice. */
  const [notice, setNotice] = useState<{ text: string; at: number } | null>(null);

  const say = useCallback((message: string) => {
    const at = performance.now();
    setNotice({ text: message, at });
    setTimeout(() => setNotice((current) => (current?.at === at ? null : current)), NOTICE_MS);
  }, []);

  /**
   * A command from the surface below. The words are written first: a task's title is taken from the
   * note as the database has it, so a command run on a line just typed would otherwise name the
   * task after the line before it.
   */
  const file = useCallback(
    async (noteId: string, text: string, ask: Filing) => {
      await onSave(noteId, text);
      await onFile?.(noteId, ask);
      const said = copy().editor;
      say(
        ask.category !== undefined
          ? said.filedUnder(ask.category)
          : ask.dueAt !== undefined
            ? said.filedAsTaskWithDate
            : said.filedAsTask,
      );
    },
    [onSave, onFile, say],
  );

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
          {words.backToWriting}
          <Kbd className="ml-1">Esc</Kbd>
        </button>
        {/* Metadata stays secondary: where the note is, said quietly, next to what it is doing.
            "In" rather than the bare path, because a folder is the likeliest place a note lives and
            not the only way to reach it — the labels and concepts below this find it too. */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate" title={words.keptIn(location)}>
            <Label>{words.inLocation(location)}</Label>
          </span>
          {/* One slot, saying what a keystroke just did and then going quiet. Beside the save
              state because they answer the same question — what just happened to this note. */}
          <p
            key={notice?.at}
            aria-live="polite"
            className={`min-w-0 truncate text-muted-foreground text-xs transition-opacity duration-200 ${
              notice === null ? "opacity-0" : "animate-settle opacity-100"
            }`}
          >
            {notice?.text}
          </p>
          {state === "idle" ? null : (
            <span key={state} className="animate-settle">
              <Label>{saveStateLabel(state)}</Label>
            </span>
          )}
          {/* Quiet until pointed at, because it is the one control here that cannot be shrugged off
              — and it is one keystroke from being undone, which is what earns it a place at all. */}
          <button
            type="button"
            onClick={() => onDelete(note)}
            aria-label={copy().common.deleteNote}
            title={words.deleteThisNote}
            className="rounded-md p-1 text-muted-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring hover:text-destructive"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
      {/* What the note is *doing*, above what it is about: a task it produced, a date it named.
          The same strip the simpler mode draws, and read from the same words. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 empty:hidden">
        <NoteMarks task={task} text={draft} />
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
        {/* Escape puts the suggestion away first, then the find box, and closes the note only when
            there is neither. */}
        <WritingSurface
          noteId={note.id}
          initial={note.content}
          draft={draft}
          setDraft={setDraft}
          className={WRITING}
          complete={complete}
          undoableAt={undoableAt}
          onUndo={onUndo}
          onNotice={say}
          onFile={(noteId, text, ask) => void file(noteId, text, ask)}
          onEscape={onClose}
        />
      </div>
    </div>
  );
};
