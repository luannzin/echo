"use client";

import type { LearnedRule } from "@echo/learning";
import { parse } from "@echo/parser";
import type { LearningEventCreate, Note } from "@echo/types";
import { CornerDownLeft } from "lucide-react";
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { readSignals, Signals } from "@/components/notes/signals";
import { Kbd } from "@/components/ui/kbd";

const MAX_HEIGHT = 420;

const PROMPTS = [
  "What's on your mind?",
  "What are you thinking about?",
  "Where did your head go today?",
  "What's worth remembering?",
  "What are you working through?",
  "What just occurred to you?",
];

/**
 * The capture surface, in both of its positions: centred on the home screen, docked at the bottom
 * of the stream. Focused immediately and writable before the database has finished opening —
 * loading notes is echo's problem, not the writer's. Nothing is stored until Enter commits.
 */
export function Composer({
  onCapture,
  onDraft,
  rules,
  onCorrect,
  docked = false,
}: {
  /** Returns the note synchronously: it exists on screen before it exists in the database. */
  onCapture: (content: string) => Note;
  /** Fires behind the typing, never in front of it: retrieval is allowed to be late. */
  onDraft: (text: string) => void;
  /** What this reader has taught echo, which decides whether a signal is worth mentioning. */
  rules: LearnedRule[];
  onCorrect: (event: LearningEventCreate) => void;
  docked?: boolean;
}) {
  const [draft, setDraft] = useState("");
  /** Signals answered in this draft. Cleared with the draft, because the next note is a new note. */
  const [settled, setSettled] = useState<Record<string, "accepted" | "rejected">>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  // Chosen once per visit: a prompt that changed under the cursor would be a distraction.
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  // Grow with the text, then scroll. Measured before paint so the box never jumps.
  //
  // Measuring means collapsing the box to nothing for an instant, and while it is collapsed the
  // stream around it is shorter — so the browser clamps its scroll position and the whole column
  // slides up under the writer. The scroller's position is taken before the measurement and put
  // back after it; if it was resting at the bottom it is pinned there again, because the composer
  // growing must never push the note you just wrote out of sight.
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

  const filled = draft.trim().length > 0;

  // Detection is advisory, so it rides a deferred copy of the draft: React finishes the keystroke
  // first and parses when it has a moment. On a 5k-character note that is the difference between
  // ~6ms and ~0ms of work per character typed.
  const deferredDraft = useDeferredValue(draft);
  const signals = useMemo(() => readSignals(parse(deferredDraft)), [deferredDraft]);

  useEffect(() => {
    const timer = setTimeout(() => onDraft(draft), 400);
    return () => clearTimeout(timer);
  }, [draft, onDraft]);

  function commit() {
    if (!filled) return;
    onCapture(draft);
    setDraft("");
    setSettled({});
    textarea.current?.focus();
  }

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
        <textarea
          id="composer"
          ref={textarea}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            commit();
          }}
          rows={1}
          spellCheck={false}
          placeholder={docked ? "Write another…" : "Write anything…"}
          className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-base leading-7 outline-none placeholder:text-muted-foreground sm:text-[0.975rem]"
        />

        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em]">
              {filled ? `${countWords(draft)} words` : "Local · private"}
            </p>
            <Signals
              signals={signals}
              rules={rules}
              settled={settled}
              onCorrect={(event, answer) => {
                setSettled((current) => ({
                  ...current,
                  [`${event.kind}:${event.subject}`]: answer,
                }));
                onCorrect(event);
              }}
            />
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={!filled}
            aria-label="Save note"
            className={`flex h-8 items-center gap-2 rounded-full bg-brand-bright px-3 font-medium text-brand-ink text-xs transition-[opacity,transform,background-color] duration-200 ease-[var(--ease-out-quart)] hover:bg-brand-bright/90 active:scale-[0.96] ${
              filled ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
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
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
