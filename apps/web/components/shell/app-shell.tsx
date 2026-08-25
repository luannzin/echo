"use client";

import { type ReactNode, useState } from "react";
import { Rail } from "@/components/shell/rail";
import { Kbd } from "@/components/ui/kbd";

/** Shell frame: rail | navigation | workspace | intelligence. */
export function AppShell({
  navigation,
  workspace,
  intelligence,
}: {
  navigation: ReactNode;
  workspace: ReactNode;
  intelligence: ReactNode;
}) {
  const [navigationOpen, setNavigationOpen] = useState(true);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Rail
        navigationOpen={navigationOpen}
        onToggleNavigation={() => setNavigationOpen((open) => !open)}
      />
      {navigationOpen ? (
        <aside
          aria-label="Navigation"
          className="hidden w-60 shrink-0 border-r border-border md:block"
        >
          {navigation}
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{workspace}</main>
      </div>
      <aside
        aria-label="Intelligence"
        className="hidden w-80 shrink-0 border-l border-border lg:block"
      >
        {intelligence}
      </aside>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 px-4">
      <Label>echo</Label>
      <div className="ml-auto flex items-center gap-3">
        <Label>Local · private</Label>
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          Search
          <Kbd>⌘K</Kbd>
        </span>
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
