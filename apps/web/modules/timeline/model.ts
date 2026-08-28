import type { TimelineDay } from "@echo/core";
import type { Note } from "@echo/types";
import { format } from "date-fns";
import { localeSpec } from "@/shared/lib/i18n";

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
  const { dates, formats } = localeSpec();
  const months: TimelineMonth[] = [];
  for (const day of days) {
    const key = format(day.date, "yyyy-MM");
    const last = months[months.length - 1];
    if (last?.key === key) last.days.push(day);
    else
      months.push({
        key,
        label: format(day.date, sameYear(day.date, now) ? formats.month : formats.monthWithYear, {
          locale: dates,
        }),
        days: [day],
      });
  }
  return months;
};

/** The number and the weekday, which is all a row needs once the month is a heading above it. */
export const dayLabel = (date: Date): { number: string; weekday: string } => {
  const { dates, formats } = localeSpec();
  return {
    number: format(date, "dd"),
    weekday: format(date, formats.weekdayShort, { locale: dates }),
  };
};
