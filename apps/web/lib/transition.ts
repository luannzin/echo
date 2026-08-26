"use client";

import { flushSync } from "react-dom";

/**
 * The name both sides of a note morph carry. Only one element may hold it at a time, which is
 * exactly the constraint that makes the morph unambiguous: the row you left and the surface you
 * arrived at are the same object as far as the browser is concerned.
 */
export const NOTE_SURFACE = "note-surface";

/** One movement at a time. A second transition over a running one skips both and looks broken. */
let travelling = false;

/**
 * Navigation as one continuous movement. A view change is a React state change, so the browser
 * needs the old frame before it happens and the new frame straight after — `flushSync` inside the
 * transition callback is what puts both in the same tick.
 *
 * `from` is the element being left, named before the outgoing frame is captured; `to` finds the
 * element being arrived at, named after the update but still inside the callback, which is the last
 * moment before the incoming frame is captured. Both names are dropped again when the movement
 * ends, so the next navigation starts from a clean slate.
 *
 * The animation is the part that is allowed to fail. A browser without view transitions, a reader
 * who asked for less motion, a tab that is not being composited, a transition the browser decides
 * to abandon — every one of those still ends with the state updated exactly once. Navigation that
 * depends on an animation succeeding is not navigation.
 */
export function navigate(
  update: () => void,
  { from, to }: { from?: HTMLElement | null; to?: () => HTMLElement | null } = {},
): void {
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

    // A transition can be abandoned before its callback ever runs. The screen may not move, but the
    // reader still asked to go somewhere. Every one of the three promises is answered, because an
    // abandoned movement is a normal outcome here, not an unhandled rejection.
    void transition.ready.catch(() => {});
    void transition.updateCallbackDone.catch(apply);
    void transition.finished.catch(() => {}).finally(release);
  } catch {
    release();
    apply();
  }
}

/**
 * Where a note is on screen right now — the far end of a morph home. The stream row wins when the
 * stream is open, because that is the place the reader was looking at; the list row is the fallback
 * for every other view.
 */
export function noteRow(noteId: string | null): HTMLElement | null {
  if (!noteId) return null;
  const selector = `[data-note-id="${CSS.escape(noteId)}"]`;
  return (
    document.querySelector<HTMLElement>(`[data-stream-scroll] ${selector}`) ??
    document.querySelector<HTMLElement>(selector)
  );
}

function animatable(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    document.visibilityState === "visible" &&
    !travelling &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
