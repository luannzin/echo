"use client";

import type { Note } from "@echo/types";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/shell/app-shell";
import { Kbd } from "@/components/ui/kbd";

const AUTOSAVE_DELAY_MS = 500;

/** An existing note, open for editing. Autosave here, because the note already exists. */
export function NoteEditor({
  note,
  onSave,
  onClose,
}: {
  note: Note;
  onSave: (noteId: string, content: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(note.content);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsaved = useRef<{ id: string; content: string } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const loadedId = useRef<string | null>(null);

  // The draft loads once per note. Re-seeding it from the store would let a save landing
  // mid-sentence overwrite characters typed while it was in flight.
  useEffect(() => {
    if (loadedId.current === note.id) return;
    loadedId.current = note.id;
    setDraft(note.content);
    // Opening a note means continuing it: the caret belongs after the last character.
    const element = textarea.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(note.content.length, note.content.length);
    element.scrollTop = element.scrollHeight;
  }, [note.id, note.content]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (draft === note.content) return;

    unsaved.current = { id: note.id, content: draft };
    timer.current = setTimeout(async () => {
      unsaved.current = null;
      setSaveState("saving");
      try {
        await onSave(note.id, draft);
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, note.id, note.content, onSave]);

  // Leaving the note — closing it or opening another — flushes whatever the debounce still holds.
  useEffect(() => {
    return () => {
      const pending = unsaved.current;
      if (!pending) return;
      unsaved.current = null;
      void onSave(pending.id, pending.content);
    };
  }, [onSave]);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-8 py-6">
      <div className="flex h-6 items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="-ml-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-muted-foreground text-xs transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Back to writing
          <Kbd className="ml-1">Esc</Kbd>
        </button>
        {saveState === "idle" ? null : (
          <span key={saveState} className="animate-settle">
            <Label>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save failed"}
            </Label>
          </span>
        )}
      </div>
      <textarea
        ref={textarea}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        aria-label="Note content"
        placeholder="Write anything…"
        spellCheck={false}
        className="mt-5 min-h-0 flex-1 resize-none bg-transparent text-[0.975rem] leading-7 outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
