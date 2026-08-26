"use client";

import {
  Brain,
  History,
  Inbox,
  type LucideIcon,
  PanelLeft,
  PenLine,
  Search,
  Settings,
  SquareCheck,
} from "lucide-react";
import type { View } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Rail({
  onToggleNavigation,
  navigationOpen,
  atHome,
  onHome,
  view,
  onViewChange,
  inboxCount,
  intelligenceOpen,
  onToggleIntelligence,
  onSearch,
}: {
  onToggleNavigation: () => void;
  navigationOpen: boolean;
  atHome: boolean;
  onHome: () => void;
  view: View;
  onViewChange: (view: View) => void;
  /** Printed on the Inbox as a count, because a pile you cannot see is a pile you never clear. */
  inboxCount: number;
  intelligenceOpen: boolean;
  onToggleIntelligence: () => void;
  onSearch: () => void;
}) {
  return (
    <TooltipProvider>
      <nav
        aria-label="Primary"
        className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3"
      >
        {/* The note panel only exists from md up, so the toggle stays out of the way below it. */}
        <div className="hidden md:block">
          <RailButton
            label={navigationOpen ? "Hide notes" : "Show notes"}
            icon={PanelLeft}
            pressed={navigationOpen}
            onClick={onToggleNavigation}
          />
        </div>
        <div className="my-1 h-px w-6 bg-sidebar-border" />
        <RailButton label="Write" icon={PenLine} active={atHome} onClick={onHome} />
        <RailButton label="Search" icon={Search} onClick={onSearch} />
        <RailButton
          label={inboxCount > 0 ? `Inbox — ${inboxCount} to place` : "Inbox"}
          icon={Inbox}
          active={view === "inbox"}
          badge={inboxCount}
          onClick={() => onViewChange("inbox")}
        />
        <RailButton
          label="Tasks"
          icon={SquareCheck}
          active={view === "tasks"}
          onClick={() => onViewChange("tasks")}
        />
        <RailButton label="Recent — soon" icon={History} unavailable />
        <div className="mt-auto flex flex-col items-center gap-1">
          {/* The intelligence panel only exists from lg up, so its toggle follows the same rule. */}
          <div className="hidden lg:block">
            <RailButton
              label={intelligenceOpen ? "Hide intelligence" : "Show intelligence"}
              icon={Brain}
              pressed={intelligenceOpen}
              onClick={onToggleIntelligence}
            />
          </div>
          <RailButton label="Settings — soon" icon={Settings} unavailable />
        </div>
      </nav>
    </TooltipProvider>
  );
}

function RailButton({
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
  /** A count worth noticing, drawn as a dot rather than a number: the number is in the tooltip. */
  badge?: number;
  /** `active` marks the current destination; `pressed` marks a panel toggle's on state. */
  active?: boolean;
  pressed?: boolean;
  /** Kept focusable rather than `disabled`, so its tooltip can still be read from the keyboard. */
  unavailable?: boolean;
  onClick?: () => void;
}) {
  return (
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
}
