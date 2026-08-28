import type { Milestone } from "@/modules/onboarding/progress";

/**
 * What the tour points at, and how it finds it.
 *
 * Components carry a `data-tour` attribute and nothing else: no wrapper, no ref threaded upward, no
 * prop that only exists because a tour might run. A component should not know it is being explained.
 *
 * The attribute is also what keeps this honest across languages — the selector was very nearly the
 * control's accessible name, which is now a translation.
 */
export const TOUR_ANCHOR: Record<Milestone, string> = {
  wrote: "composer",
  read: "signals",
  found: "search",
  placed: "inbox",
  settled: "settings",
};

export const anchorOf = (milestone: Milestone): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-tour="${TOUR_ANCHOR[milestone]}"]`);

/**
 * Where a step's mark should sit, in viewport coordinates.
 *
 * `null` when the anchor is not on screen — a phone with the rail collapsed, or a panel the reader
 * has shut. A step that cannot point at anything is a step the tour skips rather than one it draws
 * in the corner and hopes about.
 */
export type Spot = { top: number; left: number; width: number; height: number };

export const spotOf = (element: HTMLElement | null): Spot | null => {
  if (!element) return null;
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  return { top: box.top, left: box.left, width: box.width, height: box.height };
};
