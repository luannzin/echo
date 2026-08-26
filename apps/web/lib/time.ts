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
 * way in search would read as two different notes.
 *
 * date-fns does the phrasing, which is what makes these strings translatable later: a locale is one
 * argument, where hand-rolled `4m` and `3h` would each need rewriting.
 */

/**
 * How long ago a note was touched. `now` is a parameter rather than read inside, so a stamp is
 * reproducible in a test — the same reason the domain injects its clock.
 */
export function formatStamp(date: Date, now = new Date()): string {
  // Under a minute the number is noise: what the reader needs to know is that it just happened.
  if (differenceInSeconds(now, date) < 60) return "just now";
  return formatDistanceStrict(date, now, { addSuffix: true, roundingMethod: "floor" });
}

/** The label over a day's worth of notes in the stream. */
export function formatDay(date: Date, now = new Date()): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, sameYear(date, now) ? "d MMMM" : "d MMMM yyyy");
}

/** The whole answer, for when the relative stamp is not enough: a day, and a time on that day. */
export function formatExact(date: Date): string {
  return format(date, "EEEE d MMMM yyyy, HH:mm");
}

/**
 * When a task is due, said the way a person would. A date that has passed is named as such rather
 * than shown as a date, because the thing a reader needs to know about it is that it is late.
 */
export function formatDue(date: Date, now = new Date()): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  if (isPast(date)) return `${formatDistanceStrict(date, now, { roundingMethod: "floor" })} ago`;
  return format(date, sameYear(date, now) ? "EEEE d MMMM" : "d MMMM yyyy");
}

/** Which heading a task belongs under. Undated tasks are still tasks; they simply have no when. */
export function dueBucket(dueAt: Date | null, now = new Date()): "overdue" | "due" | "someday" {
  if (dueAt === null) return "someday";
  if (isToday(dueAt)) return "due";
  return dueAt.getTime() < now.getTime() ? "overdue" : "due";
}

export function sameDay(a: Date, b: Date): boolean {
  return format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd");
}

function sameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}
