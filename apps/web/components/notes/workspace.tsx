"use client";

import { Composer } from "@/components/notes/composer";
import { useEcho } from "@/components/notes/echo-provider";
import { NoteEditor } from "@/components/notes/note-editor";

/** One surface, two states: writing something new, or editing something that exists. */
export function Workspace() {
  const { selectedNote } = useEcho();
  return selectedNote ? <NoteEditor note={selectedNote} /> : <Composer />;
}
