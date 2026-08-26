import {
  differenceInSeconds,
  format,
  formatDistanceStrict,
  isPast,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";

/**
 * How echo says when. One implementation, because a note stamped one way in the stream and another
 * way in search would read as two different notes. date-fns does the phrasing, so a locale is one
 * argument rather than a rewrite.
 */

/** `now` is a parameter, not read inside, so a stamp is reproducible in a test. */
export const formatStamp = (date: Date, now = new Date()): string =>
  differenceInSeconds(now, date) < 60
    ? "just now"
    : formatDistanceStrict(date, now, { addSuffix: true, roundingMethod: "floor" });

/** The label over a day's worth of notes in the stream. */
export const formatDay = (date: Date, now = new Date()): string => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, sameYear(date, now) ? "d MMMM" : "d MMMM yyyy");
};

/** The whole answer, for when the relative stamp is not enough. */
export const formatExact = (date: Date): string => format(date, "EEEE d MMMM yyyy, HH:mm");

/** A date that has passed is named as late rather than shown as a date. */
export const formatDue = (date: Date, now = new Date()): string => {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  if (isPast(date)) return `${formatDistanceStrict(date, now, { roundingMethod: "floor" })} ago`;
  return format(date, sameYear(date, now) ? "EEEE d MMMM" : "d MMMM yyyy");
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
