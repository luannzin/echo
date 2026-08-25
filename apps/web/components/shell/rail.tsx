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
  soon?: true;
};

const items: RailItem[] = [
  { label: "Capture", icon: PenLine },
  { label: "Search", icon: Search, soon: true },
  { label: "Explorer", icon: FolderTree, soon: true },
  { label: "Tasks", icon: SquareCheck, soon: true },
  { label: "Recent", icon: History, soon: true },
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
            label={item.soon ? `${item.label} — soon` : item.label}
            icon={item.icon}
            active={!item.soon}
            disabled={item.soon}
          />
        ))}
        <div className="mt-auto">
          <RailButton label="Settings — soon" icon={Settings} disabled />
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
