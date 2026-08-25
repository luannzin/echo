"use client";

import {
  Brain,
  FolderTree,
  History,
  type LucideIcon,
  PanelLeft,
  PenLine,
  Search,
  Settings,
  SquareCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** Destinations that exist in the product but not yet in the code. */
const planned: { label: string; icon: LucideIcon }[] = [
  { label: "Search", icon: Search },
  { label: "Explorer", icon: FolderTree },
  { label: "Tasks", icon: SquareCheck },
  { label: "Recent", icon: History },
];

export function Rail({
  onToggleNavigation,
  navigationOpen,
  atHome,
  onHome,
  intelligenceOpen,
  onToggleIntelligence,
}: {
  onToggleNavigation: () => void;
  navigationOpen: boolean;
  atHome: boolean;
  onHome: () => void;
  intelligenceOpen: boolean;
  onToggleIntelligence: () => void;
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
        {planned.map((item) => (
          <RailButton
            key={item.label}
            label={`${item.label} — soon`}
            icon={item.icon}
            unavailable
          />
        ))}
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
  onClick,
}: {
  label: string;
  icon: LucideIcon;
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
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipPopup side="right">{label}</TooltipPopup>
    </Tooltip>
  );
}
