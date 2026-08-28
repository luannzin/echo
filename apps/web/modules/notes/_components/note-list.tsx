"use client";

import type { Folder, Note } from "@echo/types";
import { useId, useMemo } from "react";
import { NoteListSkeleton } from "@/modules/notes/_components/note-list-skeleton";
import { NoteRow } from "@/modules/notes/_components/note-row";
import { Count } from "@/shared/_components/count";
import { Label } from "@/shared/_components/label";
import { folderPaths } from "@/shared/lib/folder-paths";
import { copy } from "@/shared/lib/i18n";

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
  onDelete,
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
  /** Really deletes. The reader's way back is Ctrl Z, not an archive nobody asked for. */
  onDelete: (note: Note) => void;
}) => {
  const headingId = useId();
  // Named and sorted once for the whole list. Every row offers the same set of destinations, and
  // working it out per row was the single most expensive thing a capture did.
  const places = useMemo(() => folderPaths(folders), [folders]);

  return (
    <section className="flex h-full flex-col" aria-labelledby={headingId}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 id={headingId} className="min-w-0 truncate">
          <Label>{title}</Label>
        </h2>
        <Count of={notes.length} describe={copy().notes.countInList} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {failed ? (
          // An error that names no way out is just bad news. This one names two.
          <p role="alert" className="px-2 text-destructive text-sm leading-relaxed">
            {copy().notes.storageFailed}
          </p>
        ) : loading ? (
          <NoteListSkeleton />
        ) : notes.length === 0 ? (
          <p className="px-2 text-muted-foreground text-sm leading-relaxed">
            {copy().notes.nothingHereYet}
          </p>
        ) : (
          <ul>
            {notes.map((note, index) => (
              <NoteRow
                key={note.id}
                note={note}
                places={places}
                index={index}
                selected={note.id === selectedId}
                onSelect={onSelect}
                onPreview={onPreview}
                onDrag={onDrag}
                onMove={onMove}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
