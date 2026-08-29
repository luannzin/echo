"use client";

import { folderPath } from "@echo/core";
import type { Destination } from "@echo/search";
import type { Folder, Note } from "@echo/types";
import { ArrowRight, FolderPlus, Sparkles } from "lucide-react";
import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { type InboxReason, reasonKey } from "@/modules/inbox/plan";
import { Timestamp } from "@/shared/_components/timestamp";
import type { FolderPath } from "@/shared/lib/folder-paths";
import { copy, list } from "@/shared/lib/i18n";

/** One reason, said. The structure comes from `plan.ts`; the words come from the dictionary. */
const say = (reason: InboxReason): string =>
  reason.kind === "habit"
    ? copy().inbox.habit(list(reason.concepts))
    : copy().inbox.neighbour(reason.title);

/**
 * One unfiled note and the one place it probably belongs.
 *
 * Memoized per note. The suggestions arrive a slice at a time rather than all at once, so a pile of
 * a thousand is re-rendered many times over while the pass runs — and a row whose own answer has
 * not changed has nothing to redraw. Every prop is a value or a stable callback, which is what lets
 * the memo hold: the row is handed its position rather than a closure over it.
 */
export const InboxRow = memo(
  ({
    note,
    index,
    folders,
    places,
    suggestion,
    reasonsFor,
    onAccept,
    onMove,
    onOpen,
    onNewFolder,
  }: {
    note: Note;
    /** Where the row sits in the pile, so filing it can hand the keyboard to the one that replaces it. */
    index: number;
    folders: Folder[];
    /** Every folder, named and ordered once by the list rather than once per row. */
    places: FolderPath[];
    suggestion: Destination | undefined;
    /** Why this folder. Empty when echo has nothing to say beyond the neighbours. */
    reasonsFor: (noteId: string, suggestion: Destination) => InboxReason[];
    onAccept: (index: number, noteId: string, destination: Destination) => void;
    onMove: (noteId: string, folderId: string, suggested: Destination | undefined) => void;
    onOpen: (noteId: string, from: HTMLElement) => void;
    onNewFolder: () => void;
  }) => {
    const words = copy().inbox;
    /** Whether the reader has actually asked why. Until they have, the answer is not worked out. */
    const [why, setWhy] = useState(false);

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
              {note.title || copy().common.untitled}
            </span>
            <Timestamp at={note.updatedAt} />
          </span>
          {/* Two lines of the note itself: deciding where something belongs means reading a little of
            it, and opening each one to remember what it was is the cost triage has to avoid. */}
          <span className="line-clamp-2 text-muted-foreground text-sm leading-6">
            {note.content}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {suggestion ? (
            <Button
              size="sm"
              variant="secondary"
              data-triage
              onClick={() => onAccept(index, note.id, suggestion)}
              className="max-w-full gap-2"
            >
              <Sparkles aria-hidden="true" className="shrink-0 text-brand-bright" />
              {/* A folder nested four deep has a long name. The button gives up the name before it
                gives up the row. */}
              <span className="min-w-0 truncate">
                {words.moveTo(folderPath(folders, suggestion.folderId))}
              </span>
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
              {suggestion ? words.somewhereElse : words.chooseAFolder}
              <ArrowRight aria-hidden="true" />
            </MenuTrigger>
            <MenuPopup align="start" className="max-h-80 max-w-72 overflow-y-auto">
              {places.map((choice) => (
                <MenuItem
                  key={choice.id}
                  closeOnClick
                  onClick={() => onMove(note.id, choice.id, suggestion)}
                >
                  <span className="min-w-0 truncate">{choice.label}</span>
                </MenuItem>
              ))}
              {places.length > 0 ? <MenuSeparator /> : null}
              <MenuItem closeOnClick onClick={onNewFolder}>
                <FolderPlus aria-hidden="true" />
                {copy().common.newFolder}
              </MenuItem>
            </MenuPopup>
          </Menu>

          {suggestion ? (
            /* A summary you can press for the whole answer. "Why?" has to be answerable, and the
             answer is the reader's own habit and their own notes — never a score.

             The reasons are worked out on the press and not before. `details` hides its children
             rather than leaving them out, so rendering them unconditionally read every note in the
             suggested folder for every row in the pile — a hundred answers to a question nobody had
             asked yet, on the one screen that already has the most to do. */
            <details className="group/why" onToggle={(event) => setWhy(event.currentTarget.open)}>
              <summary className="cursor-pointer list-none outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {words.evidenceWhy(suggestion.because.length)}
                </Badge>
              </summary>
              <ul className="basis-full pt-2 ps-1 text-muted-foreground text-xs leading-5">
                {why
                  ? reasonsFor(note.id, suggestion).map((reason) => (
                      <li key={reasonKey(reason)}>· {say(reason)}</li>
                    ))
                  : null}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    );
  },
);
InboxRow.displayName = "InboxRow";
