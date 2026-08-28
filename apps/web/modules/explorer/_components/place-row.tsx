"use client";

import type { LucideIcon } from "lucide-react";
import { Count } from "@/shared/_components/count";
import { copy } from "@/shared/lib/i18n";
import { row } from "@/shared/lib/styles";

/** A place notes can be, drawn the same whether or not it is a folder. */
export const PlaceRow = ({
  label,
  icon: Icon,
  count,
  selected,
  droppable = false,
  over = false,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  icon: LucideIcon;
  count: number;
  selected: boolean;
  /** Left off by a place nothing can be dropped into. */
  droppable?: boolean;
  over?: boolean;
  onSelect: () => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={selected ? "page" : undefined}
    onDragOver={(event) => {
      if (!droppable) return;
      event.preventDefault();
      onDragOver?.();
    }}
    onDragLeave={onDragLeave}
    onDrop={(event) => {
      event.preventDefault();
      onDrop?.();
    }}
    className={`${row} w-full gap-2 pe-2 ps-2 ${
      over && droppable ? "bg-brand-bright/15 ring-1 ring-brand-bright/40" : ""
    } ${
      selected ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground"
    }`}
  >
    <Icon aria-hidden="true" className="size-3.5 shrink-0" />
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <Count of={count} describe={(here) => copy().explorer.inPlaceCount(here, label)} />
  </button>
);
