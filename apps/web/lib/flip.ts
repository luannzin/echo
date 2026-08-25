const EASE_OUT_QUART = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Animates an element from where it used to be to where it now is (FLIP). The element may have been
 * re-created in a different part of the tree — only the geometry has to match.
 */
export function flipFrom(element: HTMLElement, previous: DOMRect, duration = 340): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const next = element.getBoundingClientRect();
  const dx = previous.left - next.left;
  const dy = previous.top - next.top;
  const scaleX = next.width === 0 ? 1 : previous.width / next.width;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(scaleX - 1) < 0.01) return;

  element.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scaleX(${scaleX})`, transformOrigin: "left top" },
      { transform: "none", transformOrigin: "left top" },
    ],
    { duration, easing: EASE_OUT_QUART },
  );
}
