"use client";

import type { Note } from "@echo/types";
import { ArrowRight, CornerDownLeft, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
 * The capture surface. Focused immediately and writable before the database has finished opening —
 * loading notes is echo's problem, not the writer's. Nothing is stored until Enter commits.
 */
export function Composer({
  onCapture,
  onOpen,
}: {
  onCapture: (content: string) => Promise<Note>;
  onOpen: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [committing, setCommitting] = useState(false);
  const [saved, setSaved] = useState<Note | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  // Chosen once per mount: a prompt that changed under the cursor would be a distraction.
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
      setSaved(await onCapture(content));
    } catch {
      // The text goes back in the box: nothing is lost, and the writer can try again.
      setDraft(content);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center gap-5 px-6 pb-20">
      <h1
        suppressHydrationWarning
        className="text-center font-display text-4xl tracking-tight sm:text-5xl"
      >
        {prompt}
      </h1>

      {saved ? <SavedNotice note={saved} onOpen={onOpen} onDismiss={() => setSaved(null)} /> : null}

      <div className="rounded-2xl border border-border bg-card/60 shadow-black/20 shadow-lg transition-colors duration-200 focus-within:border-brand-bright/50">
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
          placeholder="Write anything…"
          className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-[0.975rem] leading-7 outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center justify-between gap-3 px-5 pb-4">
          <p className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em]">
            {filled ? `${countWords(draft)} words` : "Local · private"}
          </p>
          <button
            type="button"
            onClick={commit}
            disabled={!filled || committing}
            aria-label="Save note"
            className={`flex h-8 items-center gap-2 rounded-full bg-brand-bright px-3 font-medium text-brand-ink text-xs transition-[opacity,transform,background-color] duration-200 ease-[var(--ease-out-quart)] hover:bg-brand-bright/90 active:scale-[0.97] ${
              filled ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            Save
            <CornerDownLeft aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="text-center text-muted-foreground text-xs">
        <Kbd>Enter</Kbd> to save · <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line
      </p>
    </div>
  );
}

/** Confirmation stays put until dismissed: a toast would take the note away before it was read. */
function SavedNotice({
  note,
  onOpen,
  onDismiss,
}: {
  note: Note;
  onOpen: (noteId: string) => void;
  onDismiss: () => void;
}) {
  return (
    <Alert key={note.id} className="animate-rise items-center">
      <AlertTitle className="truncate font-normal text-muted-foreground">
        Saved <span className="text-foreground">{note.title || "Untitled"}</span> ·{" "}
        {countWords(note.content)} words
      </AlertTitle>
      <AlertAction>
        <Button size="xs" variant="ghost" onClick={() => onOpen(note.id)}>
          Continue
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Button>
        <Button size="xs" variant="ghost" aria-label="Dismiss" onClick={onDismiss}>
          <X aria-hidden="true" className="size-3.5" />
        </Button>
      </AlertAction>
    </Alert>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
