"use client";

import type { Note } from "@echo/types";
import { ArrowRight, Check, FolderOpen, Inbox as InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import type { FilingGroup } from "@/modules/inbox/plan";
import { movedBy } from "@/modules/inbox/plan";
import { Label } from "@/shared/_components/label";
import type { FolderPath } from "@/shared/lib/folder-paths";
import { copy } from "@/shared/lib/i18n";
import { stagger } from "@/shared/lib/stagger";

/**
 * The whole pile, and where all of it would go — read before anything moves.
 *
 * Filing fourteen notes wrongly is a far worse afternoon than filing them one at a time, so this is
 * a plan the reader reads rather than a change they undo. Every note is on screen under the folder
 * it is bound for, and every one of them can be sent somewhere else without leaving the plan.
 */
export const FilingPlan = ({
  plan,
  places,
  onReassign,
  onAccept,
  onCancel,
}: {
  plan: FilingGroup[];
  /** Every folder, named and ordered once — which is all the plan needs to name a destination. */
  places: FolderPath[];
  /** Sends one note somewhere other than where the plan put it, before the plan is accepted. */
  onReassign: (noteId: string, folderId: string | null) => void;
  onAccept: () => void;
  onCancel: () => void;
}) => {
  const words = copy().inbox;
  const moving = movedBy(plan);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 pb-1">
        <h1 className="font-display text-3xl tracking-tight">{words.organize}</h1>
        <Label>
          {words.movingOf(
            moving,
            plan.reduce((total, group) => total + group.notes.length, 0),
          )}
        </Label>
      </div>
      <p className="pb-6 text-muted-foreground text-sm leading-relaxed">{words.nothingHasMoved}</p>

      {plan.map((group, index) => (
        <section
          key={group.folderId ?? "inbox"}
          className="animate-rise pb-5"
          style={stagger(index)}
        >
          <div className="flex items-center gap-2 pb-1.5">
            {group.folderId === null ? (
              <InboxIcon aria-hidden="true" className="size-3 text-muted-foreground" />
            ) : (
              <FolderOpen aria-hidden="true" className="size-3 text-brand-bright" />
            )}
            <Label>{words.groupCount(group.label, group.notes.length)}</Label>
          </div>

          <ul className="flex flex-col">
            {group.notes.map((note) => (
              <li
                key={note.id}
                className="flex items-center gap-2 border-border/60 border-t py-1.5 first:border-t-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {note.title || copy().common.untitled}
                </span>
                <Elsewhere
                  note={note}
                  places={places}
                  current={group.folderId}
                  onReassign={onReassign}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Sticky, because a plan long enough to scroll must not put its own accept out of reach. */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t bg-background py-3">
        <Button onClick={onAccept} disabled={moving === 0} className="gap-2">
          <Check aria-hidden="true" />
          {moving === 0 ? words.nothingToMove : words.fileCount(moving)}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {copy().common.cancel}
        </Button>
      </div>
    </div>
  );
};

/** Sending one note somewhere other than where the plan put it, without leaving the plan. */
const Elsewhere = ({
  note,
  places,
  current,
  onReassign,
}: {
  note: Note;
  places: FolderPath[];
  current: string | null;
  onReassign: (noteId: string, folderId: string | null) => void;
}) => (
  <Menu>
    <MenuTrigger
      render={
        <Button
          size="sm"
          variant="ghost"
          aria-label={copy().inbox.sendSomewhereElse(note.title || copy().inbox.thisNote)}
          className="shrink-0 gap-1 text-muted-foreground text-xs"
        />
      }
    >
      {copy().inbox.elsewhere}
      <ArrowRight aria-hidden="true" />
    </MenuTrigger>
    <MenuPopup align="end" className="max-h-80 max-w-72 overflow-y-auto">
      {current !== null ? (
        <MenuItem closeOnClick onClick={() => onReassign(note.id, null)}>
          <InboxIcon aria-hidden="true" />
          {copy().inbox.keepInInbox}
        </MenuItem>
      ) : null}
      {places
        .filter((place) => place.id !== current)
        .map((place) => (
          <MenuItem key={place.id} closeOnClick onClick={() => onReassign(note.id, place.id)}>
            <span className="min-w-0 truncate">{place.label}</span>
          </MenuItem>
        ))}
    </MenuPopup>
  </Menu>
);
