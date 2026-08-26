"use client";

import type { CategorySource } from "@echo/types";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * One label on a note. A category the reader put there is stated; one echo read out of the note is
 * outlined and says so when you point at it — the difference has to be visible, because taking off
 * a wrong guess is how echo is told it was wrong.
 */
export const CategoryChip = ({
  name,
  source,
  onRemove,
}: {
  name: string;
  /** `auto` is echo's reading of the note, and reads quieter for it. */
  source: CategorySource;
  /** Left off where a chip is a statement rather than a control. */
  onRemove?: () => void;
}) => (
  <Badge
    variant={source === "user" ? "secondary" : "outline"}
    title={source === "user" ? name : `${name} — echo read this from the note`}
    className={`animate-settle max-w-40 gap-1 font-normal ${
      source === "user" ? "" : "border-dashed text-muted-foreground"
    }`}
  >
    <span className="truncate">{name}</span>
    {onRemove ? (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className="-me-0.5 rounded-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    ) : null}
  </Badge>
);
