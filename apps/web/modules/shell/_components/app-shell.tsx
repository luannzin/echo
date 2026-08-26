"use client";

import type { ReactNode } from "react";
import { Rail } from "@/modules/shell/_components/rail";
import { TopBar } from "@/modules/shell/_components/top-bar";
import type { View } from "@/modules/shell/view";

/** Shell frame: rail | navigation | workspace | intelligence. */
export const AppShell = ({
  navigation,
  workspace,
  intelligence,
  atHome,
  onHome,
  view,
  onViewChange,
  streamAvailable,
  inboxCount,
  navigationOpen,
  onToggleNavigation,
  intelligenceOpen,
  onToggleIntelligence,
  onSearch,
  searchShortcut,
}: {
  navigation: ReactNode;
  workspace: ReactNode;
  intelligence: ReactNode;
  atHome: boolean;
  onHome: () => void;
  view: View;
  onViewChange: (view: View) => void;
  streamAvailable: boolean;
  inboxCount: number;
  /** Panel state belongs to the page: the palette can open these panels too. */
  navigationOpen: boolean;
  onToggleNavigation: () => void;
  intelligenceOpen: boolean;
  onToggleIntelligence: () => void;
  onSearch: () => void;
  searchShortcut: string;
}) => (
  <div className="flex h-dvh overflow-hidden bg-background text-foreground">
    <a
      href="#workspace"
      className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:start-2 focus-visible:top-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-card focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm"
    >
      Skip to writing
    </a>
    <Rail
      navigationOpen={navigationOpen}
      onToggleNavigation={onToggleNavigation}
      atHome={atHome}
      onHome={onHome}
      view={view}
      onViewChange={onViewChange}
      inboxCount={inboxCount}
      intelligenceOpen={intelligenceOpen}
      onToggleIntelligence={onToggleIntelligence}
      onSearch={onSearch}
    />
    {/* Short, because this is bound to a keystroke: a panel that takes a third of a second to get
        out of the way is one the reader waits for. The inner pane keeps its full width throughout,
        so the note list itself never reflows on the way past. */}
    <aside
      aria-label="Navigation"
      inert={!navigationOpen}
      className={`hidden shrink-0 overflow-hidden border-e md:block ${
        navigationOpen
          ? "w-60 border-border opacity-100"
          : "pointer-events-none w-0 border-transparent opacity-0"
      } transition-[width,opacity,border-color] duration-180 ease-[var(--ease-out-quart)]`}
    >
      <div className="h-full w-60">{navigation}</div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar
        view={view}
        onViewChange={onViewChange}
        streamAvailable={streamAvailable}
        onSearch={onSearch}
        searchShortcut={searchShortcut}
      />
      <main id="workspace" className="min-h-0 flex-1 overflow-y-auto">
        {workspace}
      </main>
    </div>
    <aside
      aria-label="Intelligence"
      inert={!intelligenceOpen}
      className={`hidden shrink-0 overflow-hidden border-s lg:block ${
        intelligenceOpen ? "w-80 border-border opacity-100" : "w-0 border-transparent opacity-0"
      } transition-[width,opacity,border-color] duration-180 ease-[var(--ease-out-quart)]`}
    >
      <div className="h-full w-80">{intelligence}</div>
    </aside>
  </div>
);
