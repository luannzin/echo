import type { ReactNode } from "react";

/**
 * Three-pane frame: navigation | editor | intelligence.
 * Phase 0 renders the frame and honest empty states only — no data layer exists yet.
 */
export function AppShell({
  navigation,
  editor,
  intelligence,
}: {
  navigation: ReactNode;
  editor: ReactNode;
  intelligence: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Navigation"
          className="hidden w-64 shrink-0 border-r border-line bg-surface md:block"
        >
          {navigation}
        </aside>
        <main className="min-w-0 flex-1">{editor}</main>
        <aside
          aria-label="Intelligence"
          className="hidden w-80 shrink-0 border-l border-line bg-surface lg:block"
        >
          {intelligence}
        </aside>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <span className="text-sm font-medium tracking-tight">Note Taker</span>
      <button
        type="button"
        disabled
        className="ml-auto flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-line bg-raised px-3 text-left text-sm text-ink-faint disabled:cursor-not-allowed"
      >
        Search
        <kbd className="ml-auto font-mono text-xs text-ink-faint">⌘K</kbd>
      </button>
      <span className="ml-auto text-xs text-ink-faint">Phase 0 · shell</span>
    </header>
  );
}

export function Pane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col">
      <h2 className="px-4 pt-4 pb-2 text-xs font-medium tracking-wide text-ink-faint uppercase">
        {title}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 text-sm text-ink-muted">
        {children}
      </div>
    </section>
  );
}
