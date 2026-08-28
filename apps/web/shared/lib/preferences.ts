/**
 * Everything the reader has told echo about how it should behave.
 *
 * `localStorage` keeps these synchronous, so a panel never flashes open before its stored answer and
 * a settings row never shows its default before showing the reader's choice.
 *
 * Keys carry the `echo:` prefix and are named as Phase 7's `user_preferences` table will name them,
 * so sync lifts them rather than migrating them. The language is the one answer that does not live
 * here: `shared/lib/i18n` owns `echo:locale`, because the dictionary has to be pointed at a language
 * before anything can read a word of this file's own copy.
 */

/** A preference with a fixed set of answers. The values are the contract; the fallback is today's. */
export type Choice<T extends string> = {
  key: string;
  values: readonly T[];
  fallback: T;
};

/**
 * Where the notes live.
 *
 * `synced` cannot be chosen yet, and it is declared anyway: the arrival records the answer either
 * way, so a reader who wanted sync is not asked a second time when it arrives.
 */
export const STORAGE: Choice<"local" | "synced"> = {
  key: "storage",
  values: ["local", "synced"],
  fallback: "local",
};

/** Dark, light, or whatever the machine is set to. */
export const THEME: Choice<"dark" | "light" | "system"> = {
  key: "theme",
  values: ["dark", "light", "system"],
  fallback: "dark",
};

/**
 * `system` honours `prefers-reduced-motion`; `reduced` overrides it in the direction of less.
 * There is deliberately no way to ask for more motion than the machine asked for.
 */
export const MOTION: Choice<"system" | "reduced"> = {
  key: "motion",
  values: ["system", "reduced"],
  fallback: "system",
};

const named = (key: string): string => `echo:${key}`;

export const readPreference = (key: string, fallback: boolean): boolean => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(named(key));
  return stored === null ? fallback : stored === "true";
};

export const writePreference = (key: string, value: boolean): void => {
  window.localStorage.setItem(named(key), String(value));
};

/** The stored answer, or the default. An answer this build no longer offers reads as the default. */
export const readChoice = <T extends string>(choice: Choice<T>): T => {
  if (typeof window === "undefined") return choice.fallback;
  const stored = window.localStorage.getItem(named(choice.key));
  return choice.values.includes(stored as T) ? (stored as T) : choice.fallback;
};

export const writeChoice = <T extends string>(choice: Choice<T>, value: T): void => {
  window.localStorage.setItem(named(choice.key), value);
};

/** Everything echo has stored about this reader, for the reset in settings. */
export const forgetPreferences = (): void => {
  const held = Object.keys(window.localStorage).filter((key) => key.startsWith("echo:"));
  for (const key of held) window.localStorage.removeItem(key);
};
