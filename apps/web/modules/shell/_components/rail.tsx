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
import { copy } from "@/shared/lib/i18n";

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
}) => {
  const words = copy().shell.rail;

  return (
    <TooltipProvider>
      <nav
        aria-label={copy().shell.primary}
        // Below md the bottom bar is the navigation, and only one of the two is ever in the
        // document's landmarks: `hidden` takes this one out of the accessibility tree entirely.
        className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 md:flex"
      >
        {/* The panel only exists from md up, so its toggle stays out of the way below it. */}
        <div className="hidden md:block">
          <RailButton
            label={navigationOpen ? words.hideNotes : words.showNotes}
            icon={PanelLeft}
            pressed={navigationOpen}
            onClick={onToggleNavigation}
          />
        </div>
        <div className="my-1 h-px w-6 bg-sidebar-border" />
        <RailButton label={words.write} icon={PenLine} active={atHome} onClick={onHome} />
        <RailButton label={words.search} icon={Search} onClick={onSearch} />
        <RailButton
          label={inboxCount > 0 ? words.inboxWaiting(inboxCount) : words.inbox}
          icon={Inbox}
          tour="inbox"
          active={view === "inbox"}
          badge={inboxCount}
          onClick={() => onViewChange("inbox")}
        />
        <RailButton
          label={words.tasks}
          icon={SquareCheck}
          active={view === "tasks"}
          onClick={() => onViewChange("tasks")}
        />
        <RailButton
          label={words.timeline}
          icon={History}
          active={view === "timeline"}
          onClick={() => onViewChange("timeline")}
        />
        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="hidden lg:block">
            <RailButton
              label={intelligenceOpen ? words.hideIntelligence : words.showIntelligence}
              icon={Brain}
              pressed={intelligenceOpen}
              onClick={onToggleIntelligence}
            />
          </div>
          <RailButton
            label={words.settings}
            icon={Settings}
            tour="settings"
            active={view === "settings"}
            onClick={() => onViewChange("settings")}
          />
        </div>
      </nav>
    </TooltipProvider>
  );
};
