"use client";

import { CalendarClock } from "lucide-react";
import type { Upcoming } from "@/modules/timeline/model";
import { Label } from "@/shared/_components/label";
import { copy } from "@/shared/lib/i18n";
import { formatDue } from "@/shared/lib/time";

/**
 * What this week already contains, according to the notes themselves. A note that said "falar com o
 * João semana que vem" appears here the week it was pointing at.
 *
 * It is a band on a view the reader opened, not a notification and not a task. Echo does not invent
 * things to do — a task exists only where the writer agreed to one — so this says what was written
 * and nothing more.
 */
export const NowBand = ({
  upcoming,
  onOpen,
}: {
  upcoming: Upcoming[];
  onOpen: (noteId: string, from: HTMLElement) => void;
}) => {
  // Nothing pointed at this week is not an empty state; it is a band that does not exist.
  if (upcoming.length === 0) return null;

  return (
    <section className="mb-6 rounded-lg border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center gap-2 pb-2">
        <CalendarClock aria-hidden="true" className="size-3 text-muted-foreground" />
        <Label>{copy().timeline.thisWeek}</Label>
      </div>
      <ul className="flex flex-col gap-0.5">
        {upcoming.map(({ note, text, at }) => (
          <li key={`${note.id}:${text}`}>
            <button
              type="button"
              onClick={(event) => onOpen(note.id, event.currentTarget)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-3 rounded-md px-2 py-1 text-start outline-none transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {note.title || copy().common.untitled}
              </span>
              {/* The reader's own words for the date, not echo's rendering of it. */}
              <span
                className="shrink-0 text-muted-foreground text-xs"
                title={at ? formatDue(at) : undefined}
              >
                {text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
