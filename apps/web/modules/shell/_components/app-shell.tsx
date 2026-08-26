"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/modules/shell/_components/bottom-nav";
import { Rail } from "@/modules/shell/_components/rail";
import { TopBar } from "@/modules/shell/_components/top-bar";
import type { View } from "@/modules/shell/view";

/**
 * Shell frame: rail | navigation | workspace | intelligence on a desktop, and the same four regions
 * rearranged on a phone — the rail becomes a bottom bar, the navigation slides in from the edge and
 * the intelligence panel rises from the bottom.
 *
 * The rearranging is CSS, not a branch. Rendering a second tree for small screens would mean two
 * note lists in the document, two drag targets, and a first paint that guesses the viewport before
 * the browser has told anyone what it is.
 */
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
  onEditorMode,
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
  /** Left off where there is no room for a strip of tabs, which is where the mode is not offered. */
  onEditorMode?: () => void;
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

    {/* Below md the panel covers the screen it is on, so it needs a way out that is not a control. */}
    <Backdrop shown={navigationOpen} onDismiss={onToggleNavigation} className="md:hidden" />

    {/*
      One panel, two shapes. At md it is a column that gives up its width; below md it is an overlay
      that slides in from the reading edge. Short either way, because this is bound to a keystroke
      and a panel the reader waits for is a panel they stop opening.
    */}
    <aside
      aria-label="Navigation"
      inert={!navigationOpen}
      className={`fixed inset-y-0 start-0 z-40 w-[min(20rem,85vw)] shrink-0 overflow-hidden border-e bg-sidebar shadow-2xl shadow-black/40 transition-transform duration-200 ease-[var(--ease-out-quart)] md:relative md:z-auto md:bg-transparent md:shadow-none md:transition-[width,opacity,border-color] md:duration-180 ${
        navigationOpen
          ? "translate-x-0 border-border md:w-60 md:opacity-100 rtl:-translate-x-0"
          : "-translate-x-full border-transparent md:pointer-events-none md:w-0 md:translate-x-0 md:opacity-0 rtl:translate-x-full"
      }`}
    >
      <div className="h-full w-[min(20rem,85vw)] md:w-60">{navigation}</div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar
        view={view}
        onViewChange={onViewChange}
        streamAvailable={streamAvailable}
        intelligenceOpen={intelligenceOpen}
        onToggleIntelligence={onToggleIntelligence}
        onSearch={onSearch}
        searchShortcut={searchShortcut}
        onEditorMode={onEditorMode}
      />
      {/* Clears the bottom bar on a phone, and nothing on a desktop, where there is none. */}
      <main
        id="workspace"
        className="min-h-0 flex-1 overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        {workspace}
      </main>
    </div>

    <Backdrop shown={intelligenceOpen} onDismiss={onToggleIntelligence} className="lg:hidden" />

    {/* At lg a column beside the writing; below it, a sheet that rises over the bottom bar. */}
    <aside
      aria-label="Intelligence"
      inert={!intelligenceOpen}
      className={`fixed inset-x-0 bottom-0 z-40 h-[60dvh] shrink-0 overflow-hidden rounded-t-2xl border-t bg-card shadow-2xl shadow-black/40 transition-transform duration-200 ease-[var(--ease-out-quart)] lg:relative lg:inset-auto lg:z-auto lg:h-auto lg:rounded-none lg:border-t-0 lg:border-s lg:bg-transparent lg:shadow-none lg:transition-[width,opacity,border-color] lg:duration-180 ${
        intelligenceOpen
          ? "translate-y-0 border-border lg:w-80 lg:translate-y-0 lg:opacity-100"
          : "translate-y-full border-transparent lg:w-0 lg:translate-y-0 lg:opacity-0"
      }`}
    >
      <div className="h-full w-full lg:w-80">{intelligence}</div>
    </aside>

    <BottomNav
      view={view}
      onViewChange={onViewChange}
      onSearch={onSearch}
      onPlaces={onToggleNavigation}
      placesOpen={navigationOpen}
      inboxCount={inboxCount}
    />
  </div>
);

/** Dismisses whatever is over the screen. Hidden from assistive tech: the panel is the thing. */
const Backdrop = ({
  shown,
  onDismiss,
  className,
}: {
  shown: boolean;
  onDismiss: () => void;
  className: string;
}) => (
  <button
    type="button"
    tabIndex={-1}
    aria-hidden="true"
    onClick={onDismiss}
    className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 ${
      shown ? "opacity-100" : "pointer-events-none opacity-0"
    } ${className}`}
  />
);
