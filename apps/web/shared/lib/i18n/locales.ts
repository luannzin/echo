import type { Locale as DateLocale } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

/**
 * The languages echo speaks.
 *
 * Adding one is this file plus a dictionary: a new tag here, a spec below, and a `pt.ts` written
 * against the same type. Nothing else in the application knows how many there are.
 */
export const LOCALES = ["en", "pt-BR"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export type LocaleSpec = {
  /** What the reader picks it by, written in the language itself rather than about it. */
  name: string;
  /** The face of it, for a settings row that has room for one more word. */
  region: string;
  dates: DateLocale;
  /**
   * date-fns format tokens. They are here rather than at the call site because Portuguese puts
   * `de` between the day and the month, which is a fact about the language and not about the row
   * that happens to be printing a date.
   */
  formats: {
    /** A day inside the current year: `4 March`, `4 de março`. */
    day: string;
    /** A day in another year. */
    dayWithYear: string;
    /** The whole answer, for a tooltip over a relative stamp. */
    exact: string;
    /** A weekday and a day, for something that is due. */
    weekdayDay: string;
    /** A month heading inside the current year. */
    month: string;
    /** A month heading in another year. */
    monthWithYear: string;
    /** Three letters of a weekday, down the spine of the timeline. */
    weekdayShort: string;
  };
};

export const LOCALE_SPECS: Record<Locale, LocaleSpec> = {
  en: {
    name: "English",
    region: "English",
    dates: enUS,
    formats: {
      day: "d MMMM",
      dayWithYear: "d MMMM yyyy",
      exact: "EEEE d MMMM yyyy, HH:mm",
      weekdayDay: "EEEE d MMMM",
      month: "MMMM",
      monthWithYear: "MMMM yyyy",
      weekdayShort: "EEE",
    },
  },
  "pt-BR": {
    name: "Português",
    region: "Português (Brasil)",
    dates: ptBR,
    formats: {
      day: "d 'de' MMMM",
      dayWithYear: "d 'de' MMMM 'de' yyyy",
      exact: "EEEE, d 'de' MMMM 'de' yyyy, HH:mm",
      weekdayDay: "EEEE, d 'de' MMMM",
      month: "MMMM",
      monthWithYear: "MMMM 'de' yyyy",
      weekdayShort: "EEE",
    },
  },
};

/**
 * The stored answer, or the browser's, or English.
 *
 * Matched on the language subtag alone: a reader whose browser says `pt-PT` is closer to Brazilian
 * Portuguese than to English, and offering them English because the region does not match would be
 * pedantry with a cost.
 */
export const negotiate = (stored: string | null, preferred: readonly string[]): Locale => {
  if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  for (const candidate of preferred) {
    const language = candidate.toLowerCase().split("-")[0];
    const match = LOCALES.find((locale) => locale.toLowerCase().split("-")[0] === language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
};
