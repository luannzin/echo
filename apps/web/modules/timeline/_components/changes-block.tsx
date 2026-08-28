"use client";

import type { Change } from "@echo/core";
import { Sparkles } from "lucide-react";
import { Label } from "@/shared/_components/label";
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
    <section className="mb-6 rounded-lg border border-brand-bright/25 bg-brand-bright/[0.04] px-4 py-3">
      <div className="flex items-center gap-2 pb-2">
        <Sparkles aria-hidden="true" className="size-3 text-muted-foreground" />
        <Label>{copy().timeline.changedSince(scope, formatStamp(change.since))}</Label>
      </div>

      <ul className="flex flex-col gap-0.5">
        {change.notes.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={(event) => onOpen(note.id, event.currentTarget)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center rounded-md px-2 py-1 text-start text-sm outline-none transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
            >
              <span className="truncate">{note.title || copy().common.untitled}</span>
            </button>
          </li>
        ))}
      </ul>

      {change.concepts.length > 0 ? (
        <p className="pt-2 text-muted-foreground text-xs">
          {copy().timeline.newHere(change.concepts.join(" · "))}
        </p>
      ) : null}
    </section>
  );
};
