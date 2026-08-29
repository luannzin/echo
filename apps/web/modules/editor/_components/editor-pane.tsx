"use client";

import type { Note, Task } from "@echo/types";
import { NoteMarks } from "@/modules/editor/_components/note-marks";
import { WritingSurface } from "@/modules/editor/_components/writing-surface";
import { saveStateLabel, useAutosave } from "@/modules/notes/autosave";
import { CategoryChip } from "@/shared/_components/category-chip";
import { Label } from "@/shared/_components/label";
import { copy } from "@/shared/lib/i18n";
import type { Filing } from "@/shared/lib/slash";

/**
 * Given to the textarea and to the suggestion behind it; they only line up while they agree.
 *
 * A textarea's caret is exactly as tall as its line-height, so the only way to stop the caret
 * looking like a block is to bring the two closer together. This surface was 15.6px of type under
 * 28px of line — 1.79, because `leading-7` was picked for `text-base` and the arbitrary size under
 * it shrank the type without taking the line with it. 17px at 1.55 is 1.53, and larger type is what
 * a page you write on wants anyway. The caret takes the brand colour for the same reason: a full
 * line-height of pure white reads as a bar, and a blue one reads as a cursor.
 */
const WRITING =
  "min-h-full w-full flex-1 resize-none bg-transparent px-6 py-4 text-[17px] leading-[1.55] caret-brand-bright";

/**
 * One note, filling whatever it is given — the whole screen, or half of it in a split. What the note
 * is beyond its words sits in a strip above them; everything you can *do* to a note in this mode
 * lives in the header above that, and the point of the mode is a page you can write on.
 *
 * A `noteId` with no note behind it is a new note nobody has typed into yet. Nothing is stored for
 * one, which is what keeps toggling into this mode and straight back out from leaving a row behind.
 */
export const EditorPane = ({
  noteId,
  note,
  task,
  categories,
  focused,
  split,
  complete,
  onSave,
  onFocus,
  onWrite,
  undoableAt,
  onUndo,
  onNotice,
  onFile,
}: {
  noteId: string;
  /** Missing until the first keystroke makes it real. */
  note: Note | undefined;
  /** The task this note produced, if it produced one. */
  task: Task | undefined;
  /** What the note is labelled with, by name. */
  categories: readonly string[];
  focused: boolean;
  /** Whether anything is beside it — a lone pane has nothing to distinguish itself from. */
  split: boolean;
  /** Finishes the sentence from the reader's own writing. Absent until the database has opened. */
  complete?: (text: string) => string;
  onSave: (noteId: string, content: string) => Promise<void>;
  onFocus: () => void;
  /** Told what is written and which line the caret is on. Only given when something is watching. */
  onWrite?: (text: string, line: number) => void;
  /** When the app's own next undo step happened. Absent when it has nothing to take back. */
  undoableAt?: number;
  /** Takes the app's step back and names it. */
  onUndo?: () => string | null;
  /** Says what a keystroke just did, where the writer can read it. */
  onNotice?: (message: string) => void;
  /**
   * Files what a slash command asked for. The note is written first, because a task cannot belong
   * to a note that is not there yet — a tab nobody has typed into is an id and nothing else.
   */
  onFile?: (noteId: string, text: string, ask: Filing) => void;
}) => {
  const words = copy().editor;
  const content = note?.content ?? "";
  const { draft, setDraft, state } = useAutosave(noteId, content, onSave);

  return (
    <section
      aria-label={note?.title || words.newNoteTab}
      onFocusCapture={onFocus}
      className={`relative flex min-w-0 flex-col overflow-y-auto transition-colors duration-200 ${
        split && !focused ? "bg-background/40" : ""
      }`}
    >
      {state === "idle" ? null : (
        <span key={state} className="animate-settle absolute end-4 top-3 z-10">
          <Label>{saveStateLabel(state)}</Label>
        </span>
      )}

      {/* Always here, empty or not: a strip that appears on the first "todo" would push the line
          being written down the screen mid-sentence. */}
      <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-6 pt-3 pe-24">
        <NoteMarks
          task={task}
          text={draft}
          // Only when the labels below have nothing to say either: "nothing filed yet" beside a
          // category would be contradicting the chip next to it.
          fallback={categories.length === 0 ? <Label>{words.nothingFiledYet}</Label> : null}
        />

        {categories.map((name) => (
          <CategoryChip key={name} name={name} source="user" />
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <WritingSurface
          noteId={noteId}
          initial={content}
          draft={draft}
          setDraft={setDraft}
          className={WRITING}
          focused={focused}
          complete={complete}
          onWrite={onWrite}
          undoableAt={undoableAt}
          onUndo={onUndo}
          onNotice={onNotice}
          onFile={onFile}
        />
      </div>
    </section>
  );
};
