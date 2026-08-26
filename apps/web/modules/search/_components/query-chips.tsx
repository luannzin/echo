"use client";

import type { ParsedQuery } from "@echo/core";
import { CalendarRange, FolderOpen, Quote, X } from "lucide-react";
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
  const period = query.period;
  const place = query.place;
  if (!period && !place && !query.framing) return null;

  const chip = (
    key: "period" | "place",
    Icon: typeof CalendarRange,
    text: string,
    detail: string,
  ) => {
    const off = ignoring.has(key);
    return (
      <button
        type="button"
        onClick={() => onToggle(key)}
        title={off ? `Put "${text}" back` : detail}
        aria-pressed={!off}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs outline-none transition-[background-color,opacity,transform] duration-150 ease-[var(--ease-out-quart)] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] ${
          off
            ? "border-dashed border-border text-muted-foreground/60 line-through"
            : "border-brand-bright/40 bg-brand-bright/[0.06] text-foreground"
        }`}
      >
        <Icon aria-hidden="true" className="size-2.5 shrink-0" />
        <span className="max-w-40 truncate">{text}</span>
        <X aria-hidden="true" className="size-2.5 shrink-0 opacity-60" />
      </button>
    );
  };

  const span = (from: Date | null, to: Date | null): string =>
    from && to
      ? `${formatDay(from)} – ${formatDay(to)}`
      : from
        ? `since ${formatDay(from)}`
        : to
          ? `up to ${formatDay(to)}`
          : "";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
      {period ? chip("period", CalendarRange, period.text, span(period.from, period.to)) : null}
      {place ? chip("place", FolderOpen, place.name, `Only notes in ${place.name}`) : null}
      {/* Words that were a way of asking rather than part of the question. Not a filter — it took
          nothing away — so it is said rather than offered as a control. */}
      {query.framing ? (
        <span
          className="inline-flex items-center gap-1 text-muted-foreground/70 text-xs"
          title="These words were how you asked, not what you asked about"
        >
          <Quote aria-hidden="true" className="size-2.5" />
          <span className="max-w-56 truncate">{query.framing}</span>
        </span>
      ) : null}
      {filtered > 0 ? (
        <span className="ms-auto font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.14em]">
          {filtered} set aside
        </span>
      ) : null}
    </div>
  );
};
