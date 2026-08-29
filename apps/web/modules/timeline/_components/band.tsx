"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/shared/_components/label";

/**
 * One of the blocks that sits above the days: the brief, what changed, what this week holds.
 *
 * They are the same object, a soft-ruled card carrying a labelled heading, and were three copies
 * of the same class attribute, one of which had quietly drifted to a different vertical padding.
 *
 * `lit` is the one variation that means something: what changed while you were away is the only
 * block that is news, so it is the only one that borrows the brand's light. The brief and the week
 * ahead are always there, and a page where everything is highlighted highlights nothing.
 */
export const Band = ({
  icon: Icon,
  title,
  lit = false,
  children,
}: {
  /** Omitted by a band whose first line is already a sentence, like the project brief. */
  icon?: LucideIcon;
  title?: string;
  lit?: boolean;
  children: ReactNode;
}) => (
  <section
    className={`mb-6 rounded-lg border px-4 py-3 ${
      lit ? "border-brand-bright/25 bg-brand-bright/[0.04]" : "border-border bg-card/40"
    }`}
  >
    {title ? (
      <div className="flex items-center gap-2 pb-2">
        {Icon ? <Icon aria-hidden="true" className="size-3 text-muted-foreground" /> : null}
        <Label>{title}</Label>
      </div>
    ) : null}
    {children}
  </section>
);
