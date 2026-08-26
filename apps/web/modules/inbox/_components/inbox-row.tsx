"use client";

import { folderPath } from "@echo/core";
import type { Destination } from "@echo/search";
import type { Folder, Note } from "@echo/types";
import { ArrowRight, FolderPlus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Timestamp } from "@/shared/_components/timestamp";
import { folderPaths } from "@/shared/lib/folder-paths";

/** The evidence, in the reader's own notes rather than a percentage. */
const evidence = (destination: Destination): string =>
  destination.because.length === 1
    ? "1 note like it is there"
    : `${destination.because.length} notes like it are there`;

export const InboxRow = ({
  note,
  folders,
  suggestion,
  onAccept,
  onMove,
  onOpen,
  onNewFolder,
}: {
  note: Note;
  folders: Folder[];
  suggestion: Destination | undefined;
  onAccept: (noteId: string, destination: Destination) => void;
  onMove: (noteId: string, folderId: string, suggested: Destination | undefined) => void;
  onOpen: (noteId: string, from: HTMLElement) => void;
  onNewFolder: () => void;
}) => {
  const choices = folderPaths(folders);

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        data-note-id={note.id}
        onClick={(event) => onOpen(note.id, event.currentTarget)}
        className="-mx-2 flex flex-col gap-1 rounded-md px-2 py-1 text-start outline-none transition-colors duration-150 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
            {note.title || "Untitled"}
          </span>
          <Timestamp at={note.updatedAt} />
        </span>
        {/* Two lines of the note itself: deciding where something belongs means reading a little of
            it, and opening each one to remember what it was is the cost triage has to avoid. */}
        <span className="line-clamp-2 text-muted-foreground text-sm leading-6">{note.content}</span>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        {suggestion ? (
          <Button
            size="sm"
            variant="secondary"
            data-triage
            onClick={() => onAccept(note.id, suggestion)}
            className="gap-2"
          >
            <Sparkles aria-hidden="true" className="text-brand-bright" />
            Move to {folderPath(folders, suggestion.folderId)}
          </Button>
        ) : null}

        <Menu>
          <MenuTrigger
            render={
              <Button
                size="sm"
                variant={suggestion ? "ghost" : "secondary"}
                // Only when there is nothing to agree with: every row offers the keyboard exactly
                // one action, or "the next one" would mean something different row to row.
                data-triage={suggestion ? undefined : true}
                className="gap-2"
              />
            }
          >
            {suggestion ? "Somewhere else" : "Choose a folder"}
            <ArrowRight aria-hidden="true" />
          </MenuTrigger>
          <MenuPopup align="start" className="max-h-80 max-w-72 overflow-y-auto">
            {choices.map((choice) => (
              <MenuItem
                key={choice.id}
                closeOnClick
                onClick={() => onMove(note.id, choice.id, suggestion)}
              >
                {choice.label}
              </MenuItem>
            ))}
            {choices.length > 0 ? <MenuSeparator /> : null}
            <MenuItem closeOnClick onClick={onNewFolder}>
              <FolderPlus aria-hidden="true" />
              New folder
            </MenuItem>
          </MenuPopup>
        </Menu>

        {suggestion ? (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {evidence(suggestion)}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};
