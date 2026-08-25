"use client";

import type { Note } from "@echo/types";
import { CornerDownLeft } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
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
  docked = false,
}: {
  onCapture: (content: string) => Promise<Note>;
  docked?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [committing, setCommitting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  // Chosen once per visit: a prompt that changed under the cursor would be a distraction.
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  // Grow with the text, then scroll. Measured before paint so the box never jumps.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  const filled = draft.trim().length > 0;

  async function commit() {
    if (!filled || committing) return;
    setCommitting(true);
    const content = draft;
    setDraft("");
    textarea.current?.focus();
    try {
      await onCapture(content);
    } catch {
      // The text goes back in the box: nothing is lost, and the writer can try again.
      setDraft(content);
    } finally {
      setCommitting(false);
    }
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

      <div
        id="composer-shell"
        className="rounded-2xl border border-border bg-card shadow-black/20 shadow-lg transition-colors duration-200 focus-within:border-ring"
      >
        <label className="sr-only" htmlFor="composer">
          Write a note
        </label>
        <textarea
          id="composer"
          ref={textarea}
          value={draft}
          // biome-ignore lint/a11y/noAutofocus: writing is the single purpose of this screen
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void commit();
          }}
          rows={1}
          spellCheck={false}
          placeholder={docked ? "Write another…" : "Write anything…"}
          className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-base leading-7 outline-none placeholder:text-muted-foreground sm:text-[0.975rem]"
        />

        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <p className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em]">
            {filled ? `${countWords(draft)} words` : "Local · private"}
          </p>
          <button
            type="button"
            onClick={commit}
            disabled={!filled || committing}
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
