import { type Dictionary, en } from "@/shared/lib/i18n/en";
import {
  DEFAULT_LOCALE,
  LOCALE_SPECS,
  LOCALES,
  type Locale,
  type LocaleSpec,
  negotiate,
} from "@/shared/lib/i18n/locales";
import { pt } from "@/shared/lib/i18n/pt";

export type { Dictionary } from "@/shared/lib/i18n/en";
export { DEFAULT_LOCALE, LOCALE_SPECS, LOCALES, type Locale } from "@/shared/lib/i18n/locales";

/** Where the answer is kept. Named as Phase 7 will name it, so sync lifts it rather than migrates it. */
export const LOCALE_KEY = "echo:locale";

const DICTIONARIES: Record<Locale, Dictionary> = { en, "pt-BR": pt };

/**
 * Both languages ship in the bundle.
 *
 * Two languages of interface copy is tens of kilobytes, and a dynamic import would put an async
 * boundary and a blank frame in front of a language switch.
 *
 * ponytail: at four or more locales this becomes an `import()` per locale behind `copy()`, which is
 * a change to this file and to nothing that reads it.
 */
let locale: Locale = DEFAULT_LOCALE;
let active: Dictionary = en;

/**
 * The words, now.
 *
 * Read it at render time. **Never** lift it into a module-level constant: `const words =
 * copy().rail` at the top of a file captures whichever dictionary happened to be active when the
 * module was first evaluated, and then never changes again.
 *
 * This is a module rather than a context on purpose. Locale is not application state being passed
 * around; it is something every component imports, the way they import their icons. The owner in
 * `app/page.tsx` re-renders the tree when it changes, and remounts it so nothing memoised keeps a
 * sentence in the language before last.
 */
export const copy = (): Dictionary => active;

/** Which language is on screen. */
export const currentLocale = (): Locale => locale;

export const localeSpec = (): LocaleSpec => LOCALE_SPECS[locale];

/**
 * What the pre-paint script in `app/layout.tsx` already decided, read back on mount.
 *
 * `<html lang>` is the single source of truth: the script sets it before anything paints, so React
 * reading it here can never disagree with what is on screen. A window opened directly on a page
 * without that script (a test, a story) falls back to negotiating from scratch.
 */
export const readLocale = (): Locale => {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const declared = document.documentElement.lang;
  if ((LOCALES as readonly string[]).includes(declared)) return declared as Locale;
  return negotiate(
    typeof localStorage === "undefined" ? null : localStorage.getItem(LOCALE_KEY),
    typeof navigator === "undefined" ? [] : navigator.languages,
  );
};

/**
 * Points the dictionary at a language, without claiming the reader asked for it.
 *
 * This is what the owner calls on mount, for whatever the bootstrap script negotiated out of the
 * browser. Nothing is written down: a guess recorded as an answer is a guess that stops following
 * the browser it was guessed from, and it is also indistinguishable afterwards from a preference
 * the reader actually stated.
 *
 * It does not re-render anything either. The owner that called it holds the state that does, and
 * keeping those apart is what lets a component read `copy()` without subscribing to anything.
 */
export const adoptLocale = (next: Locale): void => {
  locale = next;
  active = DICTIONARIES[next];
  if (typeof document !== "undefined") document.documentElement.lang = next;
};

/** The same, plus the record that this one was chosen. */
export const setLocale = (next: Locale): void => {
  adoptLocale(next);
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    // A window with storage denied still gets the language it asked for, for as long as it is open.
  }
};

/**
 * A list of things, joined the way the language joins them: `a and b` against `a e b`.
 *
 * `Intl` rather than a conjunction in the dictionary, because the conjunction is not the hard part.
 * Portuguese and English happen to agree about the comma; Spanish does not, and neither does the
 * Oxford one this app would otherwise have to have an opinion about.
 */
export const list = (items: readonly string[]): string =>
  new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);

/** Comparing two names the way a reader of this language would sort them. */
export const compare = (a: string, b: string): number => a.localeCompare(b, locale);
