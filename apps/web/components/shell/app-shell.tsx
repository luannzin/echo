"use client";

import { MessageSquareText, PenLine, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Rail } from "@/components/shell/rail";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

/** Shell frame: rail | navigation | workspace | intelligence. */
export function AppShell({
  navigation,
  workspace,
  intelligence,
  atHome,
  onHome,
  view,
  onViewChange,
  streamAvailable,
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
  view: "home" | "stream";
  onViewChange: (view: "home" | "stream") => void;
  streamAvailable: boolean;
  /** Panel state belongs to the page: the palette can open these panels too. */
  navigationOpen: boolean;
  onToggleNavigation: () => void;
  intelligenceOpen: boolean;
  onToggleIntelligence: () => void;
  onSearch: () => void;
  searchShortcut: string;
}) {
  return (
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
        intelligenceOpen={intelligenceOpen}
        onToggleIntelligence={onToggleIntelligence}
        onSearch={onSearch}
      />
      <aside
        aria-label="Navigation"
        // One rule governs the panel in every view: the reader's own preference.
        inert={!navigationOpen}
        className={`hidden shrink-0 overflow-hidden border-e md:block ${
          navigationOpen
            ? "w-60 border-border opacity-100"
            : "pointer-events-none w-0 border-transparent opacity-0"
        } transition-[width,opacity,border-color] duration-260 ease-[var(--ease-out-quart)]`}
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
        } transition-[width,opacity,border-color] duration-260 ease-[var(--ease-out-quart)]`}
      >
        <div className="h-full w-80">{intelligence}</div>
      </aside>
    </div>
  );
}

function TopBar({
  view,
  onViewChange,
  streamAvailable,
  onSearch,
  searchShortcut,
}: {
  view: "home" | "stream";
  onViewChange: (view: "home" | "stream") => void;
  streamAvailable: boolean;
  onSearch: () => void;
  searchShortcut: string;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
      <Label>echo</Label>
      <div className="flex items-center gap-1">
        {/* The shortcut is printed on the control, which is how anyone learns it exists. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSearch}
          className="gap-2 text-muted-foreground"
        >
          <Search aria-hidden="true" />
          Search
          <Kbd className="ms-1 hidden sm:inline-flex">{searchShortcut}</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange(view === "home" ? "stream" : "home")}
          disabled={view === "home" && !streamAvailable}
          className="text-muted-foreground"
        >
          {view === "home" ? (
            <>
              <MessageSquareText aria-hidden="true" />
              Stream
            </>
          ) : (
            <>
              <PenLine aria-hidden="true" />
              Write
            </>
          )}
        </Button>
      </div>
    </header>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em]">
      {children}
    </span>
  );
}

export function Pane({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  /** A control that belongs to the pane's heading rather than to its contents. */
  action?: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <Label>{title}</Label>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 text-muted-foreground text-sm">
        {children}
      </div>
    </section>
  );
}
