"use client";

import { folderPath } from "@echo/core";
import type { Destination } from "@echo/search";
import type { Folder, Note } from "@echo/types";
import { ArrowRight, FolderPlus, Inbox as InboxIcon, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { Label } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { formatStamp } from "@/lib/time";

/**
 * Triage. Everything that has not been filed, each with the one place it probably belongs, and one
 * control to agree — because the reason notes pile up unfiled is that filing them normally costs a
 * decision, a menu and three clicks each.
 *
 * The suggestion is the reader's own notes voting: it names the neighbours that argued for it, so
 * "why there?" is answerable without a score. Accepting is a learning signal; so is choosing
 * something else, which is the correction the engine actually learns from.
 */
export function Inbox({
  notes,
  folders,
  suggestionOf,
  onAccept,
  onMove,
  onOpen,
  onNewFolder,
}: {
  notes: Note[];
  folders: Folder[];
  /** The best destination echo can argue for, or nothing when the notes do not agree. */
  suggestionOf: (noteId: string) => Destination | undefined;
  onAccept: (noteId: string, destination: Destination) => void;
  /** A destination the reader picked instead. `null` leaves the note where it is. */
  onMove: (noteId: string, folderId: string, suggested: Destination | undefined) => void;
  onOpen: (noteId: string, from: HTMLElement) => void;
  onNewFolder: () => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  /** The row a filed note is leaving, so the row that takes its place can take the keyboard too. */
  const resume = useRef<number | null>(null);

  // Filing a note is one key, and it stays one key: the note leaves, the next one arrives under the
  // same finger, and Enter files that one too. Working through an Inbox should be a rhythm, not a
  // round trip to the mouse for every note in it.
  useEffect(() => {
    const at = resume.current;
    if (at === null) return;
    resume.current = null;
    const actions = list.current?.querySelectorAll<HTMLButtonElement>("[data-triage]");
    if (!actions || actions.length === 0) return;
    actions[Math.min(at, actions.length - 1)]?.focus();
  }, [notes]);

  if (notes.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
        <InboxIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="font-display text-2xl">The Inbox is empty.</p>
        <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
          Everything you have written is filed. New notes land here until you say where they belong.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 pb-1">
        <h1 className="font-display text-3xl tracking-tight">Inbox</h1>
        <Label>
          {notes.length} {notes.length === 1 ? "note" : "notes"} to place
        </Label>
      </div>
      <p className="pb-6 text-muted-foreground text-sm leading-relaxed">
        {folders.length === 0
          ? "Make a folder and echo will start suggesting where new notes belong."
          : "Where a note goes is your call. Echo only says where notes like it already are."}
      </p>

      <ul ref={list} className="flex flex-col">
        {notes.map((note, index) => (
          <li
            key={note.id}
            className="animate-rise border-border/60 border-t py-4 first:border-t-0"
            style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
          >
            <Row
              note={note}
              folders={folders}
              suggestion={suggestionOf(note.id)}
              onAccept={(noteId, destination) => {
                resume.current = index;
                onAccept(noteId, destination);
              }}
              onMove={onMove}
              onOpen={onOpen}
              onNewFolder={onNewFolder}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({
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
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        data-note-id={note.id}
        onClick={(event) => onOpen(note.id, event.currentTarget)}
        className="group -mx-2 flex flex-col gap-1 rounded-md px-2 py-1 text-start outline-none transition-colors duration-150 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
            {note.title || "Untitled"}
          </span>
          <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground/80 tabular-nums">
            {formatStamp(note.updatedAt)}
          </span>
        </span>
        {/* Two lines of the note itself. Deciding where something belongs means reading a little
            of it, and opening each one to remember what it was is the cost triage has to avoid. */}
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
                // Only when there is nothing to agree with. Every row offers the keyboard exactly
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
            {folders.map((folder) => (
              <MenuItem
                key={folder.id}
                closeOnClick
                onClick={() => onMove(note.id, folder.id, suggestion)}
              >
                {folderPath(folders, folder.id)}
              </MenuItem>
            ))}
            {folders.length > 0 ? <MenuSeparator /> : null}
            <MenuItem closeOnClick onClick={onNewFolder}>
              <FolderPlus aria-hidden="true" />
              New folder
            </MenuItem>
          </MenuPopup>
        </Menu>

        {/* The evidence, in the reader's own notes rather than a percentage. */}
        {suggestion ? (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {suggestion.because.length === 1
              ? "1 note like it is there"
              : `${suggestion.because.length} notes like it are there`}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
