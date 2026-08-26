"use client";

import type { Folder, Note } from "@echo/types";
import { useId } from "react";
import { NoteListSkeleton } from "@/modules/notes/_components/note-list-skeleton";
import { NoteRow } from "@/modules/notes/_components/note-row";
import { Count } from "@/shared/_components/count";
import { Label } from "@/shared/_components/label";

export const NoteList = ({
  title,
  notes,
  folders,
  loading,
  failed,
  selectedId,
  onSelect,
  onPreview,
  onDrag,
  onMove,
}: {
  /** Where the list is looking: every note, or the folder being shown. */
  title: string;
  notes: Note[];
  folders: Folder[];
  loading: boolean;
  failed: boolean;
  selectedId: string | null;
  /** The row travels with the request: it is the shape the editor grows out of. */
  onSelect: (noteId: string, from: HTMLElement) => void;
  /** Announces the note under the pointer or focus, so other views can follow along. */
  onPreview: (noteId: string | null) => void;
  /** A note being picked up, or `null` when it is put down. The tree needs to know either way. */
  onDrag: (noteId: string | null) => void;
  onMove: (noteId: string, folderId: string | null) => void;
}) => {
  const headingId = useId();

  return (
    <section className="flex h-full flex-col" aria-labelledby={headingId}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 id={headingId} className="min-w-0 truncate">
          <Label>{title}</Label>
        </h2>
        <Count of={notes.length} label="notes" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {failed ? (
          // An error that names no way out is just bad news. This one names two.
          <p role="alert" className="px-2 text-destructive text-sm leading-relaxed">
            Local storage could not be opened. Reload the page, or check that this browser allows
            site data for echo.
          </p>
        ) : loading ? (
          <NoteListSkeleton />
        ) : notes.length === 0 ? (
          <p className="px-2 text-muted-foreground text-sm leading-relaxed">
            Nothing here yet. Whatever you write lands in this list.
          </p>
        ) : (
          <ul>
            {notes.map((note, index) => (
              <NoteRow
                key={note.id}
                note={note}
                folders={folders}
                index={index}
                selected={note.id === selectedId}
                onSelect={onSelect}
                onPreview={onPreview}
                onDrag={onDrag}
                onMove={onMove}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
