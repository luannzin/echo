import type { CSSProperties } from "react";

/** Cascade the first screenful of a list and let everything below it arrive at once. */
export const stagger = (index: number): CSSProperties => ({
  animationDelay: `${Math.min(index, 8) * 28}ms`,
});
