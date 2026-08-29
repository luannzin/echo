"use client";

import type { TimelineDay as Day } from "@echo/core";
import type { Note } from "@echo/types";
import { memo } from "react";
import { NoteLink } from "@/modules/timeline/_components/note-link";
import { dayLabel } from "@/modules/timeline/model";
import { numeric } from "@/shared/lib/styles";

/**
 * One day of writing, compressed to a line: the date, what the day was about, and how much of it
 * there was. Clicking a note opens it; the row itself is a heading, not a control.
 *
 * Memoized per day, because the only thing that changes while the timeline is on screen is one row
 * at a time — a note arriving, or a label being added.
 */
export const TimelineDayRow = memo(
  ({
    day,
    noteOf,
    onOpen,
  }: {
    day: Day;
    noteOf: (noteId: string) => Note | undefined;
    onOpen: (noteId: string, from: HTMLElement) => void;
  }) => {
    const { number, weekday } = dayLabel(day.date);

    return (
      <article
        style={{
          // Off screen the browser may skip the day entirely and assume its height until the reader
          // scrolls to it. A year of writing costs the layout of what is on screen.
          contentVisibility: "auto",
          containIntrinsicSize: "auto 3.5rem",
        }}
        className="flex gap-4 border-border/60 border-b py-3"
      >
        <div className="w-10 shrink-0 pt-0.5 text-end">
          <div className={`${numeric} text-sm leading-none`}>{number}</div>
          <div className="pt-1 font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.14em]">
            {weekday}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {day.concepts.length > 0 ? (
            <p className="pb-1.5 text-muted-foreground text-xs">{day.concepts.join(" · ")}</p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {day.noteIds.map((noteId) => {
              const note = noteOf(noteId);
              if (!note) return null;
              return (
                <li key={noteId}>
                  <NoteLink note={note} onOpen={onOpen} />
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`${numeric} shrink-0 pt-0.5 text-muted-foreground text-xs`}>
          {day.noteIds.length}
        </div>
      </article>
    );
  },
);

TimelineDayRow.displayName = "TimelineDayRow";
