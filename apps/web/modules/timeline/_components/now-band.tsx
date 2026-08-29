"use client";

import { CalendarClock } from "lucide-react";
import { Band } from "@/modules/timeline/_components/band";
import { NoteLink } from "@/modules/timeline/_components/note-link";
import type { Upcoming } from "@/modules/timeline/model";
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
    <Band icon={CalendarClock} title={copy().timeline.thisWeek}>
      <ul className="flex flex-col gap-0.5">
        {upcoming.map(({ note, text, at }) => (
          <li key={`${note.id}:${text}`}>
            <NoteLink
              note={note}
              onOpen={onOpen}
              trailing={
                /* The reader's own words for the date, not echo's rendering of it. */
                <span
                  className="shrink-0 text-muted-foreground text-xs"
                  title={at ? formatDue(at) : undefined}
                >
                  {text}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </Band>
  );
};
