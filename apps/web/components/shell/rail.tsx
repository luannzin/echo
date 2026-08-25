"use client";

import {
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

type RailItem = {
  label: string;
  icon: LucideIcon;
  /** Unavailable items say which phase brings them, instead of pretending to work. */
  available: boolean;
  hint?: string;
};

const items: RailItem[] = [
  { label: "Capture", icon: PenLine, available: true },
  { label: "Search", icon: Search, available: false, hint: "Arrives with search (Phase 3)" },
  { label: "Explorer", icon: FolderTree, available: false, hint: "Arrives with folders (Phase 1)" },
  { label: "Tasks", icon: SquareCheck, available: false, hint: "Arrives with tasks (Phase 5)" },
  { label: "Recent", icon: History, available: false, hint: "Arrives with notes (Phase 1)" },
];

export function Rail({
  onToggleNavigation,
  navigationOpen,
}: {
  onToggleNavigation: () => void;
  navigationOpen: boolean;
}) {
  return (
    <TooltipProvider>
      <nav
        aria-label="Primary"
        className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3"
      >
        <RailButton
          label={navigationOpen ? "Hide navigation" : "Show navigation"}
          icon={PanelLeft}
          onClick={onToggleNavigation}
        />
        <div className="my-1 h-px w-6 bg-sidebar-border" />
        {items.map((item) => (
          <RailButton
            key={item.label}
            label={item.available ? item.label : `${item.label} — ${item.hint}`}
            icon={item.icon}
            active={item.available && item.label === "Capture"}
            disabled={!item.available}
          />
        ))}
        <div className="mt-auto">
          <RailButton label="Settings — arrives with Phase 8" icon={Settings} disabled />
        </div>
      </nav>
    </TooltipProvider>
  );
}

function RailButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
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
            disabled={disabled}
            onClick={onClick}
            className={
              active
                ? "text-sidebar-accent-foreground bg-sidebar-accent"
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
