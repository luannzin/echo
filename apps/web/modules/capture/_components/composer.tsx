"use client";

import type { LearnedRule } from "@echo/learning";
import { parse } from "@echo/parser";
import type { Category, LearningEventCreate, Note } from "@echo/types";
import { CornerDownLeft } from "lucide-react";
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { type Answer, SignalChip } from "@/modules/capture/_components/signal-chip";
import { believes, readSignals, type Signal, signalKey } from "@/modules/capture/signals";
import { CategoryChip } from "@/shared/_components/category-chip";
import { GhostText } from "@/shared/_components/ghost-text";
import { Label } from "@/shared/_components/label";
import { useCompletion } from "@/shared/lib/completion";

const MAX_HEIGHT = 420;
const DRAFT_SETTLE_MS = 400;

const PROMPTS = [
  "What's on your mind?",
  "What are you thinking about?",
  "Where did your head go today?",
  "What's worth remembering?",
  "What are you working through?",
  "What just occurred to you?",
];

export type CapturedTask = { title: string; dueAt: Date | null };

/**
 * The writing surface's own type, given to the textarea and to the suggestion drawn behind it. One
 * constant because the two have to agree character for character to line up.
 */
const WRITING =
  "w-full resize-none bg-transparent px-5 pt-4 pb-2 text-base leading-7 sm:text-[0.975rem]";

const countWords = (text: string): number => text.trim().split(/\s+/).length;

/**
 * The capture surface, in both of its positions: centred on the home screen, docked at the bottom of
 * the stream. Focused immediately and writable before the database has finished opening. Nothing is
 * stored until Enter commits.
 */
export const Composer = ({
  onCapture,
  onDraft,
  rules,
  onCorrect,
  predicted,
  complete,
  undoLabel,
  restore,
  onRestored,
  docked = false,
}: {
  /** Returns the note synchronously. A task comes with it unless the writer said it was not one. */
  onCapture: (content: string, task?: CapturedTask, categoryIds?: string[]) => Note;
  /** Fires behind the typing, never in front of it: retrieval is allowed to be late. */
  onDraft: (text: string) => void;
  rules: LearnedRule[];
  onCorrect: (event: LearningEventCreate) => void;
  /** What the notes nearest this draft are labelled with. Empty until there are neighbours to ask. */
  predicted: Category[];
  /** Finishes the sentence from the reader's own writing. Absent until the database has opened. */
  complete?: (text: string) => string;
  /** Named when the note just sent can still be taken back, so the way back is on screen. */
  undoLabel?: string;
  /** Text handed back to the writer — an undone note returning to where it was written. */
  restore?: { text: string; at: number };
  /** Said once the text is back in the box, so it is not handed over a second time. */
  onRestored?: () => void;
  docked?: boolean;
}) => {
  const [draft, setDraft] = useState("");
  /** Signals answered in this draft. Cleared with the draft, because the next note is a new note. */
  const [settled, setSettled] = useState<Record<string, Answer>>({});
  /** Labels echo offered and the writer took off. Cleared with the draft, like every other answer. */
  const [declined, setDeclined] = useState<ReadonlySet<string>>(() => new Set());
  const textarea = useRef<HTMLTextAreaElement>(null);
  const completion = useCompletion(textarea, complete);
  // Chosen once per visit: a prompt that changed under the cursor would be a distraction.
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  // Grow with the text, then scroll. Measuring collapses the box for an instant, and while it is
  // collapsed the stream around it is shorter — so the browser clamps its scroll position and the
  // column slides up under the writer. Taken before and put back after.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    const scroller = element.closest("[data-stream-scroll]");
    const previousTop = scroller?.scrollTop ?? 0;
    const atBottom = scroller
      ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 4
      : false;

    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;

    if (scroller) scroller.scrollTop = atBottom ? scroller.scrollHeight : previousTop;
  }, [draft]);

  // Focused on mount rather than through `autoFocus`, which the browser skips in some hydration and
  // background-tab cases — and the cursor being ready is the whole promise of this screen.
  useEffect(() => {
    textarea.current?.focus();
  }, []);

  // An undone note comes back with the caret after the last word, and is handed over exactly once:
  // a writer who then empties the box has decided the note is gone.
  const restoredAt = restore?.at;
  useEffect(() => {
    if (restoredAt === undefined) return;
    const text = restore?.text ?? "";
    setDraft(text);
    setSettled({});
    setDeclined(new Set());
    completion.reset();
    onRestored?.();
    const element = textarea.current;
    if (!element) return;
    element.focus();
    requestAnimationFrame(() => element.setSelectionRange(text.length, text.length));
  }, [restoredAt, restore?.text, onRestored, completion.reset]);

  // Detection rides a deferred copy of the draft: React finishes the keystroke first and parses when
  // it has a moment. On a 5k-character note that is ~6ms of work per character rather than ~0.
  const deferredDraft = useDeferredValue(draft);
  const signals = useMemo(() => readSignals(parse(deferredDraft)), [deferredDraft]);

  useEffect(() => {
    const timer = setTimeout(() => onDraft(draft), DRAFT_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [draft, onDraft]);

  const filled = draft.trim().length > 0;

  /** What echo will put on this note if the writer says nothing — minus whatever they took off. */
  const offered = predicted.filter((category) => !declined.has(category.id));

  /**
   * Taking a label off is the correction the engine learns from. Filing it is not: a note that ends
   * up carrying a category becomes one of the neighbours that argues for it next time, which is the
   * positive signal already, and recording it twice would count it twice.
   */
  const decline = (category: Category) => {
    setDeclined((current) => new Set(current).add(category.id));
    onCorrect({
      type: "signal_rejected",
      kind: "category",
      subject: category.id,
      noteId: null,
    });
  };

  const commit = () => {
    if (!filled) return;
    // Parsed again at the moment of sending: the deferred copy the chips were drawn from may be a
    // keystroke behind, and a task is made from what was actually written.
    const parsed = parse(draft);
    const task = parsed.tasks[0];
    // On by default. Echo acts on what it read, and the writer's job is to say when it is wrong —
    // a chip that has to be pressed before anything happens is a to-do list with extra steps.
    const wanted = (kind: Signal["kind"]) => {
      const signal = readSignals(parsed).find((candidate) => candidate.kind === kind);
      if (!signal) return false;
      const answered = settled[signalKey(signal)];
      if (answered) return answered === "accepted";
      return believes(signal, rules);
    };
    const when = parsed.deadline ?? parsed.dates[0];

    onCapture(
      draft,
      task && wanted("task-phrase")
        ? { title: task.text, dueAt: when && wanted("deadline-phrase") ? when.date : null }
        : undefined,
      offered.map((category) => category.id),
    );
    setDraft("");
    setSettled({});
    setDeclined(new Set());
    completion.reset();
    textarea.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab takes the completion and Escape puts it away, both before anything else looks at the key.
    if (completion.onKeyDown(event, setDraft)) return;
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    commit();
  };

  const answer = (event: LearningEventCreate, key: string, answered: Answer) => {
    setSettled((current) => ({ ...current, [key]: answered }));
    onCorrect(event);
  };

  return (
    <div
      className={
        // Identical horizontal box in both positions: the travel between them is purely vertical.
        docked
          ? "mx-auto w-full max-w-2xl px-6 pb-5"
          : "mx-auto flex h-full w-full max-w-2xl flex-col justify-center gap-5 px-6 pb-20"
      }
    >
      {docked ? null : (
        <h1
          suppressHydrationWarning
          className="animate-rise text-center font-display text-4xl tracking-tight sm:text-5xl"
        >
          {prompt}
        </h1>
      )}

      {/* Named for the view transition: the same box travels between the centre of the screen and
          the foot of the stream, so it morphs rather than being replaced. */}
      <div
        id="composer-shell"
        style={{ viewTransitionName: "composer" }}
        className="rounded-2xl border border-border bg-card shadow-black/20 shadow-lg transition-colors duration-200 focus-within:border-ring"
      >
        <label className="sr-only" htmlFor="composer">
          Write a note
        </label>
        {/* The suggestion sits behind the words, in the same type, so the box stays one surface. */}
        <div className="relative">
          <GhostText
            text={draft}
            suggestion={completion.ghost}
            className={WRITING}
            from={textarea}
          />
          <textarea
            id="composer"
            ref={textarea}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              completion.refresh();
            }}
            // Fires for the caret moving as well as for typing, which is what keeps a suggestion
            // from being drawn at the end of a line the caret has left.
            onSelect={completion.refresh}
            onKeyDown={onKeyDown}
            rows={1}
            spellCheck={false}
            placeholder={docked ? "Write another…" : "Write anything…"}
            className={`relative ${WRITING} outline-none placeholder:text-muted-foreground`}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {/* One slot, three things it can be saying: what echo is, how much has been written, or
                the way back from a note that has just gone. */}
            <p
              key={completion.ghost ? "complete" : filled ? "count" : undoLabel ? "undo" : "idle"}
              className="animate-settle"
            >
              <Label>
                {completion.ghost ? (
                  <span className="text-foreground/70">Tab to complete</span>
                ) : filled ? (
                  `${countWords(draft)} words`
                ) : undoLabel ? (
                  <span className="text-foreground/70">Sent · {undoLabel} to take it back</span>
                ) : (
                  "Local · private"
                )}
              </Label>
            </p>
            {offered.map((category) => (
              <CategoryChip
                key={category.id}
                name={category.name}
                source="auto"
                onRemove={() => decline(category)}
              />
            ))}
            {signals.map((signal) => (
              <SignalChip
                key={signalKey(signal)}
                signal={signal}
                rules={rules}
                answer={settled[signalKey(signal)]}
                onCorrect={(event, answered) => answer(event, signalKey(signal), answered)}
              />
            ))}
          </div>
          {/* Arriving is 200ms so it does not snatch at the eye; answering a press is 120ms, because
              there is no such thing as hearing someone slowly. The entrance is opacity alone, so
              `transform` can only ever mean "pressed". */}
          <button
            type="button"
            onClick={commit}
            disabled={!filled}
            aria-label="Save note"
            className={`flex h-8 items-center gap-2 rounded-full bg-brand-bright px-3 font-medium text-brand-ink text-xs [transition:opacity_200ms_var(--ease-out-quart),background-color_200ms_var(--ease-out-quart),transform_120ms_var(--ease-out-quart)] hover:bg-brand-bright/90 active:scale-[0.96] ${
              filled ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            Save
            <CornerDownLeft aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>

      {docked ? null : (
        <p className="text-center text-muted-foreground text-xs">
          <Kbd>Enter</Kbd> to save · <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line
        </p>
      )}
    </div>
  );
};
