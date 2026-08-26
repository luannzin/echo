"use client";

import { useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 500;

export type SaveState = "idle" | "saving" | "saved" | "failed";

export const SAVE_STATE_LABEL: Record<Exclude<SaveState, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
};

/**
 * A note's text and the writing of it back. Both surfaces that edit a note use this, so there is one
 * debounce, one flush-on-unmount and one definition of what "saved" means.
 *
 * Mount it under `key={noteId}`: the draft is seeded once, and a component that outlived its note
 * would be a component that saves one note's words onto another.
 */
export const useAutosave = (
  noteId: string,
  stored: string,
  onSave: (noteId: string, content: string) => Promise<void>,
) => {
  const [draft, setDraft] = useState(stored);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsaved = useRef<string | null>(null);
  const flush = useRef<() => void>(() => {});

  // Only a real edit schedules a write, so opening a note and leaving it alone keeps its place.
  useEffect(() => {
    if (draft === stored) {
      unsaved.current = null;
      return;
    }

    unsaved.current = draft;
    timer.current = setTimeout(async () => {
      unsaved.current = null;
      setState("saving");
      try {
        await onSave(noteId, draft);
        setState("saved");
      } catch {
        setState("failed");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, noteId, stored, onSave]);

  // Closing flushes whatever the debounce still holds — and nothing when it holds nothing.
  useEffect(() => {
    flush.current = () => {
      const pending = unsaved.current;
      if (pending === null) return;
      unsaved.current = null;
      void onSave(noteId, pending);
    };
  }, [noteId, onSave]);

  useEffect(() => () => flush.current(), []);

  return { draft, setDraft, state };
};
