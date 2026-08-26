"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export const RailButton = ({
  label,
  icon: Icon,
  active = false,
  pressed,
  unavailable = false,
  badge = 0,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  /** `active` marks the current destination; `pressed` marks a panel toggle's on state. */
  active?: boolean;
  pressed?: boolean;
  /** Kept focusable rather than `disabled`, so its tooltip can still be read from the keyboard. */
  unavailable?: boolean;
  /** A count worth noticing, drawn as a dot — the number itself is in the tooltip. */
  badge?: number;
  onClick?: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          aria-pressed={pressed}
          aria-disabled={unavailable || undefined}
          onClick={unavailable ? undefined : onClick}
          className={
            active || pressed
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground"
          }
        />
      }
    >
      <span className="relative flex items-center justify-center">
        <Icon aria-hidden="true" />
        {badge > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -end-1 -top-1 size-1.5 rounded-full bg-brand-bright"
          />
        ) : null}
      </span>
    </TooltipTrigger>
    <TooltipPopup side="right">{label}</TooltipPopup>
  </Tooltip>
);
