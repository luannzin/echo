import type { TimelineDay } from "@echo/core";
import type { Note } from "@echo/types";
import { format } from "date-fns";

/** A month's worth of days, so a year of writing has headings rather than four hundred rows. */
export type TimelineMonth = { key: string; label: string; days: TimelineDay[] };

/** Something a note pointed at, in the week the reader is in. */
export type Upcoming = {
  note: Note;
  /** The words that named the date, exactly as they were written. */
  text: string;
  at: Date | null;
};

const sameYear = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear();

export const groupByMonth = (days: TimelineDay[], now = new Date()): TimelineMonth[] => {
  const months: TimelineMonth[] = [];
  for (const day of days) {
    const key = format(day.date, "yyyy-MM");
    const last = months[months.length - 1];
    if (last?.key === key) last.days.push(day);
    else
      months.push({
        key,
        label: format(day.date, sameYear(day.date, now) ? "MMMM" : "MMMM yyyy"),
        days: [day],
      });
  }
  return months;
};

/** The number and the weekday, which is all a row needs once the month is a heading above it. */
export const dayLabel = (date: Date): { number: string; weekday: string } => ({
  number: format(date, "dd"),
  weekday: format(date, "EEE"),
});
