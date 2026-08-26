"use client";

import type { Destination } from "@echo/search";
import type { Folder, Note } from "@echo/types";
import { Inbox as InboxIcon, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InboxRow } from "@/modules/inbox/_components/inbox-row";
import { EmptyState } from "@/shared/_components/empty-state";
import { Label } from "@/shared/_components/label";
import { folderPaths } from "@/shared/lib/folder-paths";
import { stagger } from "@/shared/lib/stagger";

/**
 * Triage. Everything that has not been filed, each with the one place it probably belongs and one
 * control to agree — because the reason notes pile up unfiled is that filing them normally costs a
 * decision, a menu and three clicks each.
 *
 * Accepting is a learning signal; so is choosing something else, which is the correction the engine
 * actually learns from.
 */
export const Inbox = ({
  notes,
  folders,
  suggestionOf,
  onAccept,
  onMove,
  onOpen,
  onNewFolder,
  onOrganize,
  reasonsFor,
}: {
  notes: Note[];
  folders: Folder[];
  /** The best destination echo can argue for, or nothing when the notes do not agree. */
  suggestionOf: (noteId: string) => Destination | undefined;
  onAccept: (noteId: string, destination: Destination) => void;
  onMove: (noteId: string, folderId: string, suggested: Destination | undefined) => void;
  onOpen: (noteId: string, from: HTMLElement) => void;
  onNewFolder: () => void;
  /** Works the whole pile out at once and shows it before anything moves. */
  onOrganize: () => void;
  /** Why echo suggests what it does, in sentences the reader can disagree with. */
  reasonsFor: (noteId: string, suggestion: Destination) => string[];
}) => {
  const list = useRef<HTMLUListElement>(null);
  /** Named and sorted once: every row offers the same destinations. */
  const places = useMemo(() => folderPaths(folders), [folders]);
  /** The row a filed note is leaving, so the row that takes its place can take the keyboard too. */
  const resume = useRef<number | null>(null);

  // Filing a note is one key and stays one key: the note leaves, the next arrives under the same
  // finger, and Enter files that one too.
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
      <EmptyState icon={InboxIcon} title="The Inbox is empty.">
        Everything you have written is filed. New notes land here until you say where they belong.
      </EmptyState>
    );
  }

  const accept = (index: number) => (noteId: string, destination: Destination) => {
    resume.current = index;
    onAccept(noteId, destination);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 pb-1">
        <h1 className="font-display text-3xl tracking-tight">Inbox</h1>
        <Label>
          {notes.length} {notes.length === 1 ? "note" : "notes"} to place
        </Label>
      </div>
      <p className="pb-4 text-muted-foreground text-sm leading-relaxed">
        {folders.length === 0
          ? "Make a folder and echo will start suggesting where new notes belong."
          : "Where a note goes is your call. Echo only says where notes like it already are."}
      </p>

      {/* One press works the whole pile out. Nothing moves until the plan has been read. */}
      {folders.length > 0 && notes.length > 1 ? (
        <div className="pb-6">
          <Button size="sm" variant="secondary" onClick={onOrganize} className="gap-2">
            <Wand2 aria-hidden="true" className="text-brand-bright" />
            Organize {notes.length} notes
          </Button>
        </div>
      ) : null}

      <ul ref={list} className="flex flex-col">
        {notes.map((note, index) => (
          <li
            key={note.id}
            className="animate-rise border-border/60 border-t py-4 first:border-t-0"
            style={stagger(index)}
          >
            <InboxRow
              note={note}
              folders={folders}
              places={places}
              suggestion={suggestionOf(note.id)}
              reasonsFor={reasonsFor}
              onAccept={accept(index)}
              onMove={onMove}
              onOpen={onOpen}
              onNewFolder={onNewFolder}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
