import type { CSSProperties } from "react";

/**
 * The headline, arriving a word at a time.
 *
 * `.beat` moves a whole element; this moves the words inside one, so the display line assembles
 * left to right instead of rising as a slab. It is the same clock-driven mechanism and it is the
 * hero's for the same reason: a view() timeline above the fold has already finished before anyone
 * looks at it.
 *
 * It is a server component and there is no motion library behind it. `apps/www/AGENTS.md` forbids
 * one on this page, and the reason is exactly this element: a JavaScript reveal declares the hidden
 * state and animates towards the visible one, which leaves the page's only headline blank wherever
 * scripts do not run or timelines do not advance — a background tab, a print, the headless renderer
 * that takes the social card. Here the words are visible in the cascade and the hidden state exists
 * only inside `@starting-style`, so the worst case is a headline that appears without moving.
 *
 * Each unit carries its own trailing whitespace so `white-space: pre` inside an inline-block keeps
 * the spaces the line is made of, and the text nodes stay intact for a screen reader.
 */
const toUnits = (text: string) =>
  (text.match(/\S+\s*/g) ?? []).map((word, order) => ({ word, order, key: `${order}-${word}` }));

export const WordReveal = ({
  text,
  delay = 0,
  stagger = 55,
}: {
  text: string;
  /** Milliseconds before the first word moves, on the same clock as `--beat`. */
  delay?: number;
  /** Milliseconds between one word and the next. */
  stagger?: number;
}) => (
  <span
    className="word-reveal"
    style={{ "--beat": `${delay}ms`, "--stagger": `${stagger}ms` } as CSSProperties}
  >
    {toUnits(text).map((unit) => (
      <span key={unit.key} style={{ "--word": unit.order } as CSSProperties}>
        {unit.word}
      </span>
    ))}
  </span>
);
