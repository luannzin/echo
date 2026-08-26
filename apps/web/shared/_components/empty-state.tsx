import type { LucideIcon } from "lucide-react";

/** A view with nothing in it yet, saying what would put something there. */
export const EmptyState = ({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
}) => (
  <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
    <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
    <p className="font-display text-2xl">{title}</p>
    <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">{children}</p>
  </div>
);
