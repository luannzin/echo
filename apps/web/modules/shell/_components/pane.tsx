import type { ReactNode } from "react";
import { Label } from "@/shared/_components/label";

/** A titled column in one of the side panels. */
export const Pane = ({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  /** A control belonging to the heading rather than to the contents. */
  action?: ReactNode;
}) => (
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
