"use client";

import { type SlashCommand, slashHint, slashLabel } from "@/shared/lib/slash";

/** Where a row lives in the accessibility tree, so the textarea can point the reader at it. */
export const slashOptionId = (base: string, at: number): string => `${base}-option-${at}`;

/**
 * One row of the `/` menu. Never focused: the caret stays in the words and the textarea points at
 * the current row with `aria-activedescendant`, which is also where the keyboard is answered — so
 * there is no key handler here, and there is nothing to tab to.
 */
export const SlashOption = ({
  command,
  id,
  at,
  active,
  argument,
  onPick,
}: {
  command: SlashCommand;
  /** The menu's own id, which every row's id is built from. */
  id: string;
  /** Where this row sits in the whole list, which is what the active index counts. */
  at: number;
  active: boolean;
  /** The words being typed for this command. Null while a command is still being chosen. */
  argument: string | null;
  onPick: () => void;
}) => (
  // biome-ignore lint/a11y/useFocusableInteractive: an option under `aria-activedescendant` is never focused — the textarea holds focus throughout
  // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard is answered by the textarea, which owns the caret and the selection
  <div
    id={slashOptionId(id, at)}
    role="option"
    aria-selected={active}
    data-active={active}
    // The caret must not leave the words: pressing here is choosing, not focusing.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onPick}
    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg py-1 ps-1 pe-2 transition-colors duration-100 hover:bg-brand-bright/12 hover:text-foreground ${
      active ? "bg-brand-bright/12 text-foreground" : "text-muted-foreground"
    }`}
  >
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-100 ${
        active
          ? "border-brand-bright/40 bg-brand-bright/15 text-brand-bright"
          : "border-border/60 bg-muted/40"
      }`}
    >
      <command.icon aria-hidden="true" className="size-3.5" />
    </span>

    <span className="min-w-0 flex-1 truncate text-sm">{slashLabel(command)}</span>

    {argument === null ? (
      <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground/70">
        {slashHint(command)}
      </span>
    ) : (
      <span className="min-w-0 max-w-40 truncate text-brand-bright text-sm">
        {argument.length === 0 ? "…" : argument}
      </span>
    )}
  </div>
);
