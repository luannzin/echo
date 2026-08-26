"use client";

import {
  Brain,
  History,
  Inbox,
  PanelLeft,
  PenLine,
  Search,
  Settings,
  SquareCheck,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RailButton } from "@/modules/shell/_components/rail-button";
import type { View } from "@/modules/shell/view";

export const Rail = ({
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
  /** Printed on the Inbox, because a pile you cannot see is a pile you never clear. */
  inboxCount: number;
  intelligenceOpen: boolean;
  onToggleIntelligence: () => void;
  onSearch: () => void;
}) => (
  <TooltipProvider>
    <nav
      aria-label="Primary"
      // Below md the bottom bar is the navigation, and only one of the two is ever in the
      // document's landmarks: `hidden` takes this one out of the accessibility tree entirely.
      className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 md:flex"
    >
      {/* The panel only exists from md up, so its toggle stays out of the way below it. */}
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
      <RailButton
        label="Timeline"
        icon={History}
        active={view === "timeline"}
        onClick={() => onViewChange("timeline")}
      />
      <div className="mt-auto flex flex-col items-center gap-1">
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
