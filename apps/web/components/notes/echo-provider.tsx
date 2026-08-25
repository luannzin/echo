"use client";

import type { Echo } from "@echo/core";
import type { Note } from "@echo/types";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getEcho } from "@/lib/echo";

export type SaveState = "idle" | "saving" | "saved" | "error";

type EchoContextValue = {
  ready: boolean;
  error: Error | null;
  notes: Note[];
  selectedNote: Note | null;
  saveState: SaveState;
  select: (noteId: string | null) => void;
  capture: (content: string) => Promise<Note | null>;
  saveContent: (noteId: string, content: string) => Promise<void>;
};

const EchoContext = createContext<EchoContextValue | null>(null);

export function EchoProvider({ children }: { children: ReactNode }) {
  const [echo, setEcho] = useState<Echo | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let active = true;
    getEcho()
      .then(async (instance) => {
        if (!active) return;
        setEcho(instance);
        setNotes(await instance.notes.list());
      })
      .catch((cause: Error) => active && setError(cause));
    return () => {
      active = false;
    };
  }, []);

  // ponytail: any domain event reloads the whole list. Fine to 200 notes, revisit with virtualization.
  useEffect(() => {
    if (!echo) return;
    return echo.events.subscribe(() => {
      echo.notes.list().then(setNotes);
    });
  }, [echo]);

  /** Capture commits the composer's text as a note. Nothing is written before that. */
  const capture = useCallback(
    async (content: string) => {
      if (!echo || content.trim().length === 0) return null;
      return echo.notes.create({ content });
    },
    [echo],
  );

  const saveContent = useCallback(
    async (noteId: string, content: string) => {
      if (!echo) return;
      setSaveState("saving");
      try {
        await echo.notes.saveContent(noteId, content);
        setSaveState("saved");
      } catch (cause) {
        setSaveState("error");
        throw cause;
      }
    },
    [echo],
  );

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;

  return (
    <EchoContext.Provider
      value={{
        ready: echo !== null,
        error,
        notes,
        selectedNote,
        saveState,
        select: setSelectedId,
        capture,
        saveContent,
      }}
    >
      {children}
    </EchoContext.Provider>
  );
}

export function useEcho(): EchoContextValue {
  const value = useContext(EchoContext);
  if (!value) throw new Error("useEcho must be used inside EchoProvider");
  return value;
}
