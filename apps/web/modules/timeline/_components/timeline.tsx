"use client";

import { buildTimeline, type Change } from "@echo/core";
import type { Note } from "@echo/types";
import { History } from "lucide-react";
import { useMemo } from "react";
import { NoteListSkeleton } from "@/modules/notes/_components/note-list-skeleton";
import { ChangesBlock } from "@/modules/timeline/_components/changes-block";
import { NowBand } from "@/modules/timeline/_components/now-band";
import { TimelineDayRow } from "@/modules/timeline/_components/timeline-day";
import { groupByMonth, type Upcoming } from "@/modules/timeline/model";
import { EmptyState } from "@/shared/_components/empty-state";
import { Label } from "@/shared/_components/label";

/**
 * The reader's own history, compressed. The stream is every note in the order it was written; this
 * is one row per day, carrying what that day was about — which is the difference between scrolling
 * back through six weeks and seeing them.
 *
 * It shows whatever the pane has narrowed to, so selecting a folder or a category turns it into that
 * project's history without a second control to keep in step.
 */
export const Timeline = ({
  notes,
  conceptsOf,
  scope,
  change,
  upcoming,
  loading,
  onOpen,
}: {
  notes: Note[];
  /** A note's labels, by name. The page arranges them once; this never asks per row. */
  conceptsOf: (noteId: string) => readonly string[];
  /** What is being looked at, named — or null for everything the reader has written. */
  scope: string | null;
  change: Change | null;
  upcoming: Upcoming[];
  loading: boolean;
  onOpen: (noteId: string, from: HTMLElement) => void;
}) => {
  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const months = useMemo(
    () => groupByMonth(buildTimeline(notes, { conceptsOf })),
    [notes, conceptsOf],
  );

  if (loading && notes.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-6">
        <NoteListSkeleton />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <EmptyState icon={History} title="Nothing to look back on yet.">
        Every note you write lands on a day here, with what that day was about. Come back once there
        is a week of it.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h1 className="font-display text-3xl tracking-tight">{scope ?? "Timeline"}</h1>
        <Label>
          {notes.length} {notes.length === 1 ? "note" : "notes"} over {months.length}{" "}
          {months.length === 1 ? "month" : "months"}
        </Label>
      </div>

      <NowBand upcoming={upcoming} onOpen={onOpen} />
      {scope ? <ChangesBlock change={change} scope={scope} onOpen={onOpen} /> : null}

      {months.map((month) => (
        <section key={month.key} className="pb-6">
          {/* Sticky, so the month a reader has scrolled into stays named above the days in it. */}
          <h2 className="sticky top-0 z-10 bg-background py-2">
            <Label>{month.label}</Label>
          </h2>
          {month.days.map((day) => (
            <TimelineDayRow
              key={day.date.getTime()}
              day={day}
              noteOf={(noteId) => byId.get(noteId)}
              onOpen={onOpen}
            />
          ))}
        </section>
      ))}
    </div>
  );
};
