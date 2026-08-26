"use client";

import type { Folder, Note } from "@echo/types";
import { FolderInput, Inbox } from "lucide-react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Timestamp } from "@/shared/_components/timestamp";
import { folderPaths } from "@/shared/lib/folder-paths";
import { stagger } from "@/shared/lib/stagger";

/**
 * One note in the navigation list. Draggable onto a place in the tree, and carrying the same move
 * as a right-click — dragging is the quick way, the menu is the one that works from the keyboard.
 */
export const NoteRow = ({
  note,
  folders,
  index,
  selected,
  onSelect,
  onPreview,
  onDrag,
  onMove,
}: {
  note: Note;
  folders: Folder[];
  index: number;
  selected: boolean;
  onSelect: (noteId: string, from: HTMLElement) => void;
  onPreview: (noteId: string | null) => void;
  onDrag: (noteId: string | null) => void;
  onMove: (noteId: string, folderId: string | null) => void;
}) => {
  const elsewhere = folderPaths(folders).filter((choice) => choice.id !== note.folderId);

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
              className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar ${
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
            <p className="px-2 py-1.5 text-muted-foreground text-xs leading-5">
              No folders yet. Make one and notes can be sent to it from here.
            </p>
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
};
