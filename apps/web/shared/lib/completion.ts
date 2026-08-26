"use client";

import { useCallback, useRef, useState } from "react";

/**
 * The completion under the caret, and the two keys that answer it.
 *
 * There is no debounce and no deferred value here on purpose. Completing is a handful of map
 * lookups against a model that is already in memory, so it runs on the keystroke itself — anything
 * that arrives a frame later arrives after the character that made it wrong.
 *
 * A hook rather than props because three writing surfaces need the same behaviour, the same way
 * they already share one definition of autosave.
 */
export const useCompletion = (
  surface: React.RefObject<HTMLTextAreaElement | null>,
  /** Absent until the local database has opened, which is what makes a first paint suggest nothing. */
  complete: ((text: string) => string) | undefined,
) => {
  const [ghost, setGhost] = useState("");
  /** The exact text a suggestion was waved away at, so Escape holds until something changes. */
  const dismissedAt = useRef<string | null>(null);

  /**
   * Only ever at the end of what is written. A suggestion drawn after text the caret is not at
   * would be a promise Tab could not keep, and mid-sentence is where a guess is least wanted.
   */
  const refresh = useCallback(() => {
    const element = surface.current;
    if (!element || !complete) return;
    const text = element.value;
    const atEnd = element.selectionStart === text.length && element.selectionEnd === text.length;
    if (!atEnd || dismissedAt.current === text) {
      setGhost("");
      return;
    }
    setGhost(complete(text));
  }, [complete, surface]);

  /**
   * Tab takes the suggestion; Escape puts it away. Returns whether the key was spent, so Tab still
   * moves focus and Escape still closes a note whenever there is nothing on screen to answer.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>, apply: (text: string) => void): boolean => {
      if (ghost.length === 0 || event.nativeEvent.isComposing) return false;
      const element = surface.current;
      if (!element) return false;

      if (event.key === "Tab") {
        event.preventDefault();
        const next = element.value + ghost;
        apply(next);
        setGhost("");
        dismissedAt.current = null;
        // After the state has landed: setting the range against the old value would drop the caret
        // in the middle of the words just accepted.
        requestAnimationFrame(() => element.setSelectionRange(next.length, next.length));
        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setGhost("");
        dismissedAt.current = element.value;
        return true;
      }

      return false;
    },
    [ghost, surface],
  );

  /** Said when the surface's text is replaced from outside — a restored draft, a new note. */
  const reset = useCallback(() => {
    setGhost("");
    dismissedAt.current = null;
  }, []);

  return { ghost, refresh, onKeyDown, reset };
};
