"use client";

import type { Change } from "@echo/core";
import { Sparkles } from "lucide-react";
import { Band } from "@/modules/timeline/_components/band";
import { NoteLink } from "@/modules/timeline/_components/note-link";
import { copy } from "@/shared/lib/i18n";
import { formatStamp } from "@/shared/lib/time";

/**
 * What arrived since the reader last looked at this project. Single-user, so all of it is their own
 * writing — which is the point: coming back after two weeks, the question is not who changed it but
 * what you had already decided.
 */
export const ChangesBlock = ({
  change,
  scope,
  onOpen,
}: {
  change: Change | null;
  /** What the reader is looking at, named, so the heading is about their project and not "here". */
  scope: string;
  onOpen: (noteId: string, from: HTMLElement) => void;
}) => {
  // Nothing arrived is not an empty state. A block that says "no changes" is a block that gets
  // scrolled past every time.
  if (!change) return null;

  return (
    <Band
      lit
      icon={Sparkles}
      title={copy().timeline.changedSince(scope, formatStamp(change.since))}
    >
      <ul className="flex flex-col gap-0.5">
        {change.notes.map((note) => (
          <li key={note.id}>
            <NoteLink note={note} onOpen={onOpen} />
          </li>
        ))}
      </ul>

      {change.concepts.length > 0 ? (
        <p className="pt-2 text-muted-foreground text-xs">
          {copy().timeline.newHere(change.concepts.join(" · "))}
        </p>
      ) : null}
    </Band>
  );
};
