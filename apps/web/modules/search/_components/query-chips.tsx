"use client";

import type { ParsedQuery } from "@echo/core";
import { X } from "lucide-react";
import { copy } from "@/shared/lib/i18n";
import { formatDay } from "@/shared/lib/time";

/**
 * What echo took the question to mean, as things the reader can take back.
 *
 * These narrow the answer rather than merely re-order it, which is only fair because every one of
 * them is on screen and one press from gone. A filter nobody can see is a filter that hides the
 * answer; a filter nobody can remove is worse.
 */
export const QueryChips = ({
  query,
  ignoring,
  filtered,
  onToggle,
}: {
  query: ParsedQuery;
  ignoring: ReadonlySet<"period" | "place">;
  /** How many notes the filters removed. Narrowing is never silent. */
  filtered: number;
  onToggle: (filter: "period" | "place") => void;
}) => {
  const words = copy().search;
  const period = query.period;
  const place = query.place;
  if (!period && !place && !query.framing) return null;

  /**
   * No icon. A calendar beside "semana passada" and a folder beside "Prod" say nothing the words do
   * not, and a Lucide glyph small enough to sit in a 12px chip still carries a 2px stroke — it reads
   * as a dense mark rather than as a small one, louder than the label it is decorating.
   */
  const chip = (key: "period" | "place", text: string, detail: string) => {
    const off = ignoring.has(key);
    return (
      <button
        type="button"
        onClick={() => onToggle(key)}
        title={off ? words.putBack(text) : detail}
        aria-pressed={!off}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs outline-none transition-[background-color,opacity,transform] duration-150 ease-[var(--ease-out-quart)] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] ${
          off
            ? "border-dashed border-border text-muted-foreground/60 line-through"
            : "border-brand-bright/40 bg-brand-bright/[0.06] text-foreground"
        }`}
      >
        <span className="max-w-40 truncate">{text}</span>
        {/* The one mark that earns its place: it is the affordance, not a label for the label. */}
        <X aria-hidden="true" className="size-3 shrink-0 opacity-50" />
      </button>
    );
  };

  const span = (from: Date | null, to: Date | null): string =>
    from && to
      ? words.between(formatDay(from), formatDay(to))
      : from
        ? words.since(formatDay(from))
        : to
          ? words.upTo(formatDay(to))
          : "";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
      {period ? chip("period", period.text, span(period.from, period.to)) : null}
      {place ? chip("place", place.name, words.onlyIn(place.name)) : null}
      {/* Words that were a way of asking rather than part of the question. Not a filter — it took
          nothing away — so it is said rather than offered as a control. */}
      {query.framing ? (
        <span
          className="max-w-56 truncate text-muted-foreground/70 text-xs italic"
          title={words.howYouAsked}
        >
          {query.framing}
        </span>
      ) : null}
      {filtered > 0 ? (
        <span className="ms-auto font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.14em]">
          {words.setAside(filtered)}
        </span>
      ) : null}
    </div>
  );
};
