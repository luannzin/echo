"use client";

import { parse } from "@echo/parser";
import type { Note, Task } from "@echo/types";
import { CalendarClock, CircleCheck, CircleDashed } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  type History,
  historyOf,
  keepHistory,
  record,
  redo,
  undo,
  undoableAt,
} from "@/modules/editor/history";
import { lineAtOffset } from "@/modules/editor/markdown";
import { SAVE_STATE_LABEL, useAutosave } from "@/modules/notes/autosave";
import { CategoryChip } from "@/shared/_components/category-chip";
import { GhostText } from "@/shared/_components/ghost-text";
import { Label } from "@/shared/_components/label";
import { useCompletion } from "@/shared/lib/completion";
import { isRedoChord, isUndoChord } from "@/shared/lib/shortcuts";
import { numeric } from "@/shared/lib/styles";
import { formatDue } from "@/shared/lib/time";

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
  undoableAt: appUndoAt,
  onUndo,
  onNotice,
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
}) => {
  const { draft, setDraft, state } = useAutosave(noteId, note?.content ?? "", onSave);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const completion = useCompletion(textarea, complete);

  /**
   * This note's own undo history, taken from outside the component so that walking away to another
   * tab and back does not empty it. The browser's stack belongs to the textarea element, and this
   * pane is remounted under a new key on every tab change — which is precisely when someone reaches
   * for Ctrl Z.
   */
  const history = useRef<History>(
    historyOf(noteId, note?.content ?? "", (note?.content ?? "").length),
  );

  /** Every change a person made, which is the only kind worth being able to take back. */
  const edit = useCallback(
    (text: string, caret: number) => {
      history.current = record(history.current, { text, caret }, Date.now());
      keepHistory(noteId, history.current);
      setDraft(text);
    },
    [noteId, setDraft],
  );

  // Where the caret is, for whatever is following it — the preview, today. Reported from the
  // element rather than from React state because the caret moves without the text changing.
  const report = useCallback(() => {
    const element = textarea.current;
    if (element) onWrite?.(element.value, lineAtOffset(element.value, element.selectionStart));
  }, [onWrite]);

  /** Puts a step from the history on screen, caret and all. False when there was no step to take. */
  const walk = useCallback(
    (next: History | null): boolean => {
      if (next === null) return false;
      history.current = next;
      keepHistory(noteId, next);
      setDraft(next.present.text);
      completion.reset();
      // After the state has landed: setting the range against the old value drops the caret in the
      // middle of words that are no longer there.
      requestAnimationFrame(() => {
        const element = textarea.current;
        if (!element) return;
        element.setSelectionRange(next.present.caret, next.present.caret);
        report();
      });
      return true;
    },
    [noteId, setDraft, completion.reset, report],
  );

  /**
   * Ctrl Z, arbitrated. There is no ranking between a note that was deleted and a paragraph that
   * was erased — they are two things that happened, and the keystroke undoes whichever happened
   * last. Both sides are asked when they happened; the later one answers.
   */
  const takeBack = useCallback(() => {
    const mine = undoableAt(history.current);
    if (mine !== null && (appUndoAt === undefined || mine >= appUndoAt)) {
      // Named for what the writer did, not for what the step does: taking back an erasure puts
      // words on the screen, and being told "took back" while words appear reads as a bug.
      const erased = history.current.past.at(-1);
      const putting = (erased?.text.length ?? 0) > history.current.present.text.length;
      walk(undo(history.current));
      onNotice?.(putting ? "Put back what you erased" : "Took back what you wrote");
      return;
    }
    const label = onUndo?.() ?? null;
    onNotice?.(label === null ? "Nothing left to take back" : `Took back — ${label}`);
  }, [appUndoAt, onUndo, onNotice, walk]);

  /** Only the words have a way forward: nothing the app takes back can be put back by a keystroke. */
  const putForward = useCallback(() => {
    onNotice?.(walk(redo(history.current)) ? "Put it back" : "Nothing to put forward");
  }, [walk, onNotice]);

  // Typing, and the first paint after the preview is opened on a note already full of words.
  useEffect(() => {
    onWrite?.(draft, lineAtOffset(draft, textarea.current?.selectionStart ?? draft.length));
  }, [draft, onWrite]);

  // Opening a note means continuing it: the caret belongs after the last character.
  useEffect(() => {
    const element = textarea.current;
    if (!element || !focused) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    element.scrollTop = element.scrollHeight;
    // Focus is claimed when this pane becomes the one being written in, not on every render.
  }, [focused]);

  // Nothing files a task or a label from this mode, so a note written here has neither until it is
  // opened in the full app. Reading the words is what is left, and it is the same reader the
  // composer uses — deferred, so a 5k-character note is parsed between keystrokes rather than on
  // each one. Named as a reading, never as a fact: nothing was stored on the strength of it.
  const deferred = useDeferredValue(draft);
  const read = useMemo(() => parse(deferred), [deferred]);

  const due = task?.dueAt ?? read.deadline?.date ?? null;
  /** Stored beats read: once a task exists, it is what the note *is*, not what it looks like. */
  const stated = task !== undefined;
  const detected = read.tasks[0];

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

      {/* Always here, empty or not: a strip that appears on the first "todo" would push the line
          being written down the screen mid-sentence. */}
      <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-6 pt-3 pe-24">
        {stated || detected ? (
          <Badge
            variant={stated ? "secondary" : "outline"}
            title={
              stated
                ? task?.completedAt
                  ? `Done — ${task.title}`
                  : `A task on this note — ${task?.title}`
                : `echo reads this as something to do — "${detected?.text}"`
            }
            className={`max-w-56 gap-1 font-normal ${stated ? "" : "border-dashed text-muted-foreground"}`}
          >
            {task?.completedAt ? (
              <CircleCheck aria-hidden="true" className="size-3" />
            ) : (
              <CircleDashed aria-hidden="true" className="size-3" />
            )}
            <span className="truncate">{stated ? "Task" : "Reads as a task"}</span>
          </Badge>
        ) : null}

        {due ? (
          <Badge
            variant={task?.dueAt ? "secondary" : "outline"}
            title={
              task?.dueAt
                ? "When this is due"
                : `echo read a date in the note — ${read.deadline?.text}`
            }
            className={`gap-1 font-normal ${numeric} ${
              task?.dueAt ? "" : "border-dashed text-muted-foreground"
            }`}
          >
            <CalendarClock aria-hidden="true" className="size-3" />
            {formatDue(due)}
          </Badge>
        ) : null}

        {categories.map((name) => (
          <CategoryChip key={name} name={name} source="user" />
        ))}

        {stated || detected || due || categories.length > 0 ? null : (
          <Label>Nothing filed yet</Label>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <GhostText text={draft} suggestion={completion.ghost} className={WRITING} from={textarea} />
        <textarea
          ref={textarea}
          value={draft}
          onChange={(event) => {
            edit(event.target.value, event.target.selectionStart);
            completion.refresh();
          }}
          onSelect={() => {
            completion.refresh();
            report();
          }}
          onKeyDown={(event) => {
            if (completion.onKeyDown(event, (text) => edit(text, text.length))) return;
            const undoing = isUndoChord(event.nativeEvent);
            if (!undoing && !isRedoChord(event.nativeEvent)) return;
            // Always taken from the browser, even when there is nothing left to take back: its own
            // stack and this one would otherwise disagree about what the note said. Stopped from
            // the window too, because the page holds the same chord and this pane has just decided
            // between them.
            event.preventDefault();
            event.stopPropagation();
            if (undoing) takeBack();
            else putForward();
          }}
          aria-label="Note content"
          placeholder="Write anything…"
          spellCheck={false}
          className={`relative ${WRITING} outline-none placeholder:text-muted-foreground`}
        />
      </div>
    </section>
  );
};
