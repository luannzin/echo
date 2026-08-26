/** A control that stays out of the way until it is wanted, and never hides from the keyboard. */
export const quiet =
  "opacity-0 transition-opacity duration-150 pointer-coarse:opacity-100 focus-visible:opacity-100 group-hover:opacity-100";

/**
 * A row in the navigation pane. One definition, because the Inbox, "All notes" and every folder are
 * the same gesture and used to be three slightly different ones — and because the pane is a column
 * on a desktop and a full sheet on a phone, where 32px is a row you miss. Coarse pointers get the
 * height, mice keep the density.
 */
export const row =
  "flex items-center rounded-md py-1.5 text-start text-sm outline-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] pointer-coarse:py-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar";

/** The mono, tabular voice every number and timestamp in the interface speaks in. */
export const numeric = "font-mono tabular-nums";
