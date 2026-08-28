import { MOTION, readChoice, THEME, writeChoice } from "@/shared/lib/preferences";

/**
 * How echo looks and how much it moves, applied to the document.
 *
 * Both are attributes on `<html>` rather than state anything renders from: the stylesheet already
 * holds a complete light palette at `:root` and a dark one under `.dark` (`app/globals.css`), so a
 * theme is a class and not a second set of components. The same is true of motion, which every
 * animation in the app already reads from the document rather than from a prop.
 */

export type Theme = (typeof THEME)["values"][number];
export type Motion = (typeof MOTION)["values"][number];

/** `system` asked the machine; the other two are the reader overruling it. */
export const resolveTheme = (theme: Theme): "dark" | "light" => {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

export const applyTheme = (theme: Theme): void => {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // The form control palette follows the page, or a native select in a light window opens dark.
  root.style.colorScheme = resolved;
};

export const applyMotion = (motion: Motion): void => {
  // Only ever set to ask for less. There is no value that asks for more than the machine wants.
  if (motion === "reduced") document.documentElement.dataset.echoMotion = "reduced";
  else delete document.documentElement.dataset.echoMotion;
};

export const setTheme = (theme: Theme): void => {
  writeChoice(THEME, theme);
  applyTheme(theme);
};

export const setMotion = (motion: Motion): void => {
  writeChoice(MOTION, motion);
  applyMotion(motion);
};

export const currentTheme = (): Theme => readChoice(THEME);
export const currentMotion = (): Motion => readChoice(MOTION);

/**
 * Follows the machine while the reader has not overruled it.
 *
 * Returns its own way of stopping, so the owner can drop the listener with the rest of its effects.
 */
export const watchSystemTheme = (onChange: () => void): (() => void) => {
  const query = window.matchMedia("(prefers-color-scheme: light)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
