"use client";

import { MessageSquareText, PenLine } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Rail } from "@/components/shell/rail";
import { Button } from "@/components/ui/button";
import { readPreference, writePreference } from "@/lib/preferences";

/** Shell frame: rail | navigation | workspace | intelligence. */
export function AppShell({
  navigation,
  workspace,
  intelligence,
  atHome,
  onHome,
  showNavigation,
  view,
  onViewChange,
  streamAvailable,
}: {
  navigation: ReactNode;
  workspace: ReactNode;
  intelligence: ReactNode;
  atHome: boolean;
  onHome: () => void;
  /** The stream is a single column: the note list would only compete with it. */
  showNavigation: boolean;
  view: "home" | "stream";
  onViewChange: (view: "home" | "stream") => void;
  streamAvailable: boolean;
}) {
  // Both panels render closed, then open to the stored preference on mount. The first paint always
  // matches the prerendered markup, so nothing jumps — the panels animate into place instead.
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  useEffect(() => {
    setNavigationOpen(readPreference("notes-panel", true));
    setIntelligenceOpen(readPreference("intelligence-panel", true));
  }, []);

  function toggleNavigation() {
    setNavigationOpen((open) => {
      writePreference("notes-panel", !open);
      return !open;
    });
  }

  function toggleIntelligence() {
    setIntelligenceOpen((open) => {
      writePreference("intelligence-panel", !open);
      return !open;
    });
  }

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
        onToggleNavigation={toggleNavigation}
        atHome={atHome}
        onHome={onHome}
        intelligenceOpen={intelligenceOpen}
        onToggleIntelligence={toggleIntelligence}
      />
      <aside
        aria-label="Navigation"
        // Width carries the open/closed preference; opacity carries the view. Keeping its width in
        // the stream is what stops the workspace sliding sideways mid-transition.
        inert={!showNavigation || !navigationOpen}
        className={`hidden shrink-0 overflow-hidden border-e md:block ${
          navigationOpen ? "w-60" : "w-0"
        } ${
          showNavigation && navigationOpen
            ? "border-border opacity-100"
            : "pointer-events-none border-transparent opacity-0"
        } transition-[width,opacity,border-color] duration-260 ease-[var(--ease-out-quart)]`}
      >
        <div className="h-full w-60">{navigation}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} onViewChange={onViewChange} streamAvailable={streamAvailable} />
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
}: {
  view: "home" | "stream";
  onViewChange: (view: "home" | "stream") => void;
  streamAvailable: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
      <Label>echo</Label>
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

export function Pane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3">
        <Label>{title}</Label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 text-muted-foreground text-sm">
        {children}
      </div>
    </section>
  );
}
