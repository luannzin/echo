import type { ReactNode } from "react";

/**
 * The page's call to action, in the three tones it actually speaks in.
 *
 * The hero and the footer make the same offer twice — run it, or read the source — and were two
 * copies of the same three class attributes, differing only in a step of horizontal padding. A
 * change of hover state had already been made in one of them and not the other.
 *
 * The nav's own button is deliberately not here: it is smaller, and it inverts on hover rather than
 * washing, because a control that sits on a sticky bar over moving content has to separate from it.
 * One call site is not a variant.
 */
const TONES = {
  /** The one thing the section wants pressed. */
  solid: "border rule-ink bg-ink text-brand hover:bg-brand-deep hover:text-ink",
  /** The alternative, offered at the same weight but not the same volume. */
  outline: "border rule-ink text-ink/85 hover:bg-ink/10 hover:text-ink",
  /** A third option that is really a link, and should read as one. */
  quiet: "text-ink/85 underline decoration-ink/30 underline-offset-4 hover:text-ink",
} as const;

const SIZES = {
  md: { solid: "px-5 py-3", outline: "px-5 py-3", quiet: "px-2 py-3" },
  lg: { solid: "px-6 py-3", outline: "px-6 py-3", quiet: "px-2 py-3" },
} as const;

export const Cta = ({
  href,
  tone,
  size = "md",
  children,
}: {
  href: string;
  tone: keyof typeof TONES;
  size?: keyof typeof SIZES;
  children: ReactNode;
}) => (
  <a href={href} className={`press label transition-colors ${SIZES[size][tone]} ${TONES[tone]}`}>
    {children}
  </a>
);
