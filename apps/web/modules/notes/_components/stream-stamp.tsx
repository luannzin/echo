"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { formatExact } from "@/shared/lib/time";

/**
 * A relative stamp that answers the obvious follow-up. "3 days ago" is the right thing to read at a
 * glance; resting on it answers "which day, exactly?" without spending a line on it.
 */
export const StreamStamp = ({
  date,
  muted = false,
  children,
}: {
  date: Date;
  muted?: boolean;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <time
          dateTime={date.toISOString()}
          className={`cursor-pointer font-mono text-[0.6875rem] uppercase tracking-[0.14em] tabular-nums ${
            muted ? "text-muted-foreground/80" : "text-muted-foreground"
          }`}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipPopup side="top">{formatExact(date)}</TooltipPopup>
  </Tooltip>
);
