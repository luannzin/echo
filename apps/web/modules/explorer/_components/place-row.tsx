"use client";

import type { LucideIcon } from "lucide-react";
import { Count } from "@/shared/_components/count";

/** The Inbox: a place notes can be, drawn like a folder without being one. */
export const PlaceRow = ({
  label,
  icon: Icon,
  count,
  selected,
  droppable,
  over,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  icon: LucideIcon;
  count: number;
  selected: boolean;
  droppable: boolean;
  over: boolean;
  onSelect: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={selected ? "page" : undefined}
    onDragOver={(event) => {
      if (!droppable) return;
      event.preventDefault();
      onDragOver();
    }}
    onDragLeave={onDragLeave}
    onDrop={(event) => {
      event.preventDefault();
      onDrop();
    }}
    className={`flex w-full items-center gap-2 rounded-md py-1.5 pe-2 ps-2 text-start text-sm outline-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring ${
      over && droppable ? "bg-brand-bright/15 ring-1 ring-brand-bright/40" : ""
    } ${
      selected ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground"
    }`}
  >
    <Icon aria-hidden="true" className="size-3.5 shrink-0" />
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <Count of={count} />
  </button>
);
