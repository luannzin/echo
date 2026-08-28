"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { copy } from "@/shared/lib/i18n";

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  /** What choosing it actually does, where the label alone does not say. */
  note?: string;
  /** Rendered and refused. A choice echo will offer later is not a choice it hides now. */
  unavailable?: boolean;
};

/**
 * A set of answers to one question, as cards.
 *
 * Native radios underneath, visually hidden. Arrow keys, the group, the announced position in it
 * and the label association are all the browser's, and everything this file adds is paint — which
 * is the whole reason not to build a `role="radiogroup"` by hand and then owe it a key handler.
 *
 * An unavailable option is `disabled` rather than absent: a reader who wants sync should be able to
 * see that echo knows the question, and hiding it would leave them wondering whether they missed it.
 */
export const Choices = <T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  /** Names the group for assistive tech. The visible heading is the section's, not this one's. */
  legend: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
}) => {
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const chosen = option.value === value;
        const noteId = `${name}-${option.value}-note`;
        return (
          <label
            key={option.value}
            className={`group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out-quart)] has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-1 has-focus-visible:ring-offset-background ${
              chosen
                ? "border-brand-bright/40 bg-brand-bright/[0.06]"
                : "border-border hover:bg-card"
            } ${option.unavailable ? "cursor-not-allowed opacity-55" : "active:scale-[0.995]"}`}
          >
            {/*
              The label wraps the input, so the whole card is a hit area. Naming the input outright
              is what keeps the name to the answer: read from the wrapper, the name would swallow
              the sentence under it and the "not yet" chip beside it, and a radio announced as three
              clauses is a radio nobody can compare against the next one.
            */}
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={chosen}
              disabled={option.unavailable}
              onChange={() => onChange(option.value)}
              aria-label={option.label}
              aria-describedby={option.note ? noteId : undefined}
              className="sr-only"
            />
            {/* The mark is drawn rather than native: a radio dot at this size is the browser's, and
                the browser's does not take the brand colour in every engine echo runs in. */}
            <span
              aria-hidden="true"
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                chosen
                  ? "border-brand-bright bg-brand-bright text-brand-ink"
                  : "border-border group-hover:border-muted-foreground"
              }`}
            >
              {chosen ? <Check aria-hidden="true" className="size-2.5" /> : null}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm">
                {option.label}
                {option.unavailable ? (
                  <span className="rounded-full border border-border px-1.5 py-px font-mono text-[0.5625rem] text-muted-foreground uppercase tracking-[0.14em]">
                    {copy().settings.notYet}
                  </span>
                ) : null}
              </span>
              {option.note ? (
                <span id={noteId} className="text-muted-foreground text-xs leading-5">
                  {option.note}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};
