"use client";

import { useEffect, useRef, useState } from "react";
import { useEcho } from "@/components/notes/echo-provider";
import { Label } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";

const AUTOSAVE_DELAY_MS = 500;

export function NoteEditor() {
  const { selectedNote, saveContent, saveState, createNote, ready } = useEcho();
  const [draft, setDraft] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const loadedId = useRef<string | null>(null);
  const noteId = selectedNote?.id ?? null;

  // The draft is loaded once per note. Re-seeding it from the store would let a save that lands
  // mid-sentence overwrite the characters typed while it was in flight.
  useEffect(() => {
    if (!selectedNote || loadedId.current === selectedNote.id) return;
    loadedId.current = selectedNote.id;
    setDraft(selectedNote.content);
    textarea.current?.focus();
  }, [selectedNote]);

  // Autosave never blocks a keystroke: state updates immediately, persistence trails it.
  useEffect(() => {
    if (!noteId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveContent(noteId, draft), AUTOSAVE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, noteId, saveContent]);

  if (!selectedNote) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-5 px-6 pb-16">
        <Label>Local · no account · no AI</Label>
        <h1 className="text-balance font-display text-5xl leading-[0.95] tracking-tight">
          The note taker that learns with you.
        </h1>
        <p className="max-w-prose text-muted-foreground leading-relaxed">
          Start writing and echo keeps up: it saves as you type, and learns where your thinking
          belongs.
        </p>
        <div>
          <Button onClick={createNote} disabled={!ready}>
            New note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-8 py-6">
      <div className="flex h-5 items-center justify-between">
        <Label>{selectedNote.title || "Untitled"}</Label>
        <SaveIndicator state={saveState} />
      </div>
      <textarea
        ref={textarea}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => saveContent(selectedNote.id, draft)}
        aria-label="Note content"
        placeholder="Write anything…"
        spellCheck={false}
        className="mt-4 min-h-0 flex-1 resize-none bg-transparent text-[0.95rem] leading-7 outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: ReturnType<typeof useEcho>["saveState"] }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save failed";
  return <Label>{text}</Label>;
}
