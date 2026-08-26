"use client";

import type { Note } from "@echo/types";
import { FolderInput, Inbox } from "lucide-react";
import { memo } from "react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MenuNote } from "@/shared/_components/menu-note";
import { Timestamp } from "@/shared/_components/timestamp";
import type { FolderPath } from "@/shared/lib/folder-paths";
import { stagger } from "@/shared/lib/stagger";
import { row } from "@/shared/lib/styles";

/**
 * One note in the navigation list. Draggable onto a place in the tree, and carrying the same move
 * as a right-click — dragging is the quick way, the menu is the one that works from the keyboard.
 *
 * Memoized per note: a capture appends one row, and re-reading the whole list to draw it cost the
 * writing surface more than the database write did.
 */
export const NoteRow = memo(
  ({
    note,
    places,
    index,
    selected,
    onSelect,
    onPreview,
    onDrag,
    onMove,
  }: {
    note: Note;
    /** Every folder, named and ordered once by the list rather than once per row. */
    places: FolderPath[];
    index: number;
    selected: boolean;
    onSelect: (noteId: string, from: HTMLElement) => void;
    onPreview: (noteId: string | null) => void;
    onDrag: (noteId: string | null) => void;
    onMove: (noteId: string, folderId: string | null) => void;
  }) => {
    const elsewhere = places.filter((choice) => choice.id !== note.folderId);

    const onDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", note.title);
      onDrag(note.id);
    };

    return (
      <li className="animate-rise" style={stagger(index)}>
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <button
                type="button"
                draggable
                data-note-id={note.id}
                onDragStart={onDragStart}
                onDragEnd={() => onDrag(null)}
                onClick={(event) => onSelect(note.id, event.currentTarget)}
                onMouseEnter={() => onPreview(note.id)}
                onMouseLeave={() => onPreview(null)}
                onFocus={() => onPreview(note.id)}
                onBlur={() => onPreview(null)}
                aria-current={selected ? "page" : undefined}
                title={note.title || "Untitled"}
                // Presses down under the pointer: opening a note is a navigation, and one that gives
                // nothing back until the next screen arrives feels like a click that missed.
                className={`${row} w-full gap-2 px-2 ${
                  selected
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              />
            }
          >
            <span className="min-w-0 flex-1 truncate">{note.title || "Untitled"}</span>
            <Timestamp at={note.updatedAt} />
          </ContextMenuTrigger>
          <ContextMenuPopup align="start" className="max-h-80 max-w-72 overflow-y-auto">
            {note.folderId === null ? null : (
              <ContextMenuItem closeOnClick onClick={() => onMove(note.id, null)}>
                <Inbox aria-hidden="true" />
                Back to Inbox
              </ContextMenuItem>
            )}
            {elsewhere.length === 0 && note.folderId === null ? (
              <MenuNote>No folders yet. Make one and notes can be sent to it from here.</MenuNote>
            ) : null}
            {elsewhere.map((choice) => (
              <ContextMenuItem
                key={choice.id}
                closeOnClick
                onClick={() => onMove(note.id, choice.id)}
              >
                <FolderInput aria-hidden="true" />
                {choice.label}
              </ContextMenuItem>
            ))}
          </ContextMenuPopup>
        </ContextMenu>
      </li>
    );
  },
);
NoteRow.displayName = "NoteRow";
