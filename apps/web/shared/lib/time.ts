import {
  differenceInSeconds,
  format,
  formatDistanceStrict,
  isPast,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { copy, localeSpec } from "@/shared/lib/i18n";

/**
 * How echo says when. One implementation, because a note stamped one way in the stream and another
 * way in search would read as two different notes. date-fns does the phrasing, so a locale is one
 * argument rather than a rewrite.
 *
 * The format tokens come from `i18n/locales.ts` rather than sitting inline here: Portuguese puts
 * `de` between the day and the month, which is a fact about the language and not about the row
 * that happens to be printing a date.
 */

/** date-fns takes the same option object everywhere; assembling it once keeps the calls honest. */
const options = () => ({ locale: localeSpec().dates });

/** `now` is a parameter, not read inside, so a stamp is reproducible in a test. */
export const formatStamp = (date: Date, now = new Date()): string =>
  differenceInSeconds(now, date) < 60
    ? copy().time.justNow
    : formatDistanceStrict(date, now, {
        ...options(),
        addSuffix: true,
        roundingMethod: "floor",
      });

/** The label over a day's worth of notes in the stream. */
export const formatDay = (date: Date, now = new Date()): string => {
  if (isToday(date)) return copy().time.today;
  if (isYesterday(date)) return copy().time.yesterday;
  const { formats } = localeSpec();
  return format(date, sameYear(date, now) ? formats.day : formats.dayWithYear, options());
};

/** The whole answer, for when the relative stamp is not enough. */
export const formatExact = (date: Date): string =>
  format(date, localeSpec().formats.exact, options());

/** A date that has passed is named as late rather than shown as a date. */
export const formatDue = (date: Date, now = new Date()): string => {
  if (isToday(date)) return copy().time.today;
  if (isTomorrow(date)) return copy().time.tomorrow;
  if (isYesterday(date)) return copy().time.yesterday;
  // `addSuffix` rather than a phrase of our own: `5 days ago` and `há 5 dias` put the marker on
  // opposite sides of the number, and date-fns already knows which side each language uses.
  if (isPast(date)) {
    return formatDistanceStrict(date, now, {
      ...options(),
      addSuffix: true,
      roundingMethod: "floor",
    });
  }
  const { formats } = localeSpec();
  return format(date, sameYear(date, now) ? formats.weekdayDay : formats.dayWithYear, options());
};

/** Which heading a task belongs under. Undated tasks are still tasks; they simply have no when. */
export const dueBucket = (dueAt: Date | null, now = new Date()): "overdue" | "due" | "someday" => {
  if (dueAt === null) return "someday";
  if (isToday(dueAt)) return "due";
  return dueAt.getTime() < now.getTime() ? "overdue" : "due";
};

export const sameDay = (a: Date, b: Date): boolean =>
  format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd");

const sameYear = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear();
