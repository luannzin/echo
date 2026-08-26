"use client";

import { flushSync } from "react-dom";

/**
 * The name both sides of a note morph carry. Only one element may hold it at a time, which is what
 * makes the morph unambiguous.
 */
export const NOTE_SURFACE = "note-surface";

/** One movement at a time. A second transition over a running one skips both and looks broken. */
let travelling = false;

const animatable = (): boolean =>
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  document.visibilityState === "visible" &&
  !travelling &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Navigation as one continuous movement. `flushSync` inside the transition callback puts the old
 * frame and the new one in the same tick; `from` is named before the outgoing frame is captured and
 * `to` after the update, still inside the callback.
 *
 * The animation is the part that is allowed to fail. Every path still ends with the state updated
 * exactly once — navigation that depends on an animation succeeding is not navigation.
 */
export const navigate = (
  update: () => void,
  { from, to }: { from?: HTMLElement | null; to?: () => HTMLElement | null } = {},
): void => {
  let updated = false;
  const apply = () => {
    if (updated) return;
    updated = true;
    update();
  };

  if (!animatable()) {
    apply();
    return;
  }

  if (from) from.style.viewTransitionName = NOTE_SURFACE;
  let arrived: HTMLElement | null = null;
  const release = () => {
    travelling = false;
    // A name left behind would claim the next morph for an element nobody is looking at.
    if (from) from.style.viewTransitionName = "";
    if (arrived) arrived.style.viewTransitionName = "";
  };

  try {
    travelling = true;
    const transition = document.startViewTransition(() => {
      flushSync(apply);
      arrived = to?.() ?? null;
      if (arrived) arrived.style.viewTransitionName = NOTE_SURFACE;
    });

    // All three are answered: an abandoned transition is a normal outcome here, not a rejection.
    void transition.ready.catch(() => {});
    void transition.updateCallbackDone.catch(apply);
    void transition.finished.catch(() => {}).finally(release);
  } catch {
    release();
    apply();
  }
};

/** Where a note is on screen right now. The stream wins, because that is where the reader was. */
export const noteRow = (noteId: string | null): HTMLElement | null => {
  if (!noteId) return null;
  const selector = `[data-note-id="${CSS.escape(noteId)}"]`;
  return (
    document.querySelector<HTMLElement>(`[data-stream-scroll] ${selector}`) ??
    document.querySelector<HTMLElement>(selector)
  );
};
