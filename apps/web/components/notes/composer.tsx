"use client";

import { CornerDownLeft } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEcho } from "@/components/notes/echo-provider";
import { Kbd } from "@/components/ui/kbd";

const MAX_HEIGHT = 420;

/**
 * The capture surface. Always focused, always writable, and holding no note until the writer
 * commits one with Enter — nothing is created behind their back.
 */
export function Composer() {
  const { capture, select, ready, notes } = useEcho();
  const [draft, setDraft] = useState("");
  const [committing, setCommitting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, then scroll. Measured before paint so the box never jumps.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  // The composer is disabled while PGlite opens, and a disabled field cannot take focus.
  useEffect(() => {
    if (ready) textarea.current?.focus();
  }, [ready]);

  const filled = draft.trim().length > 0;

  async function commit() {
    if (!filled || !ready || committing) return;
    setCommitting(true);
    try {
      const note = await capture(draft);
      if (note) {
        setDraft("");
        select(note.id);
      }
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center gap-6 px-6 pb-20">
      <h1 className="animate-rise text-center font-display text-4xl tracking-tight sm:text-5xl">
        {notes.length === 0 ? "What's on your mind?" : "Keep going."}
      </h1>

      <div className="rounded-2xl border border-border bg-card/60 shadow-black/20 shadow-lg transition-colors duration-200 focus-within:border-brand-bright/50">
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
            void commit();
          }}
          rows={1}
          disabled={!ready}
          spellCheck={false}
          placeholder="Write anything…"
          className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-[0.975rem] leading-7 outline-none placeholder:text-muted-foreground disabled:opacity-60"
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

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
