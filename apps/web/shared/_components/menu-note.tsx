import type { ReactNode } from "react";

/** A footnote inside a menu: what an item will actually do, said before it is chosen. */
export const MenuNote = ({ children }: { children: ReactNode }) => (
  <p className="px-2 py-1.5 text-muted-foreground text-xs leading-5">{children}</p>
);
