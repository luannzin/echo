import type { ReactNode } from "react";

/** The interface's quietest voice: section headings, states, counts of things. */
export const Label = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.14em]">
    {children}
  </span>
);
