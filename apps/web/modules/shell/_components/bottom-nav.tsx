"use client";

import { FolderTree, Inbox, type LucideIcon, PenLine, Search, SquareCheck } from "lucide-react";
import type { View } from "@/modules/shell/view";
import { copy } from "@/shared/lib/i18n";

type Item = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  onSelect: () => void;
};

/**
 * The phone's whole navigation. Mobile is not a shrunk desktop: there is no rail and no room for
 * one, so the five places a reader goes sit under the thumb instead.
 */
export const BottomNav = ({
  view,
  onViewChange,
  onSearch,
  onPlaces,
  placesOpen,
  inboxCount,
}: {
  view: View;
  onViewChange: (view: View) => void;
  onSearch: () => void;
  onPlaces: () => void;
  placesOpen: boolean;
  inboxCount: number;
}) => {
  const words = copy().shell.bottomNav;
  const items: Item[] = [
    {
      label: words.write,
      icon: PenLine,
      active: view === "home" || view === "stream",
      onSelect: () => onViewChange("home"),
    },
    { label: words.search, icon: Search, active: false, onSelect: onSearch },
    {
      label: words.inbox,
      icon: Inbox,
      active: view === "inbox",
      badge: inboxCount,
      onSelect: () => onViewChange("inbox"),
    },
    {
      label: words.tasks,
      icon: SquareCheck,
      active: view === "tasks",
      onSelect: () => onViewChange("tasks"),
    },
    { label: words.places, icon: FolderTree, active: placesOpen, onSelect: onPlaces },
  ];

  return (
    <nav
      aria-label={copy().shell.primary}
      // Above the home indicator on a phone that has one, and above nothing on one that does not.
      className="fixed inset-x-0 bottom-0 z-40 flex border-sidebar-border border-t bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onSelect}
          aria-current={item.active ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.625rem] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
            item.active ? "text-foreground" : "text-sidebar-foreground"
          }`}
        >
          <span className="relative flex items-center justify-center">
            <item.icon aria-hidden="true" className="size-5" />
            {item.badge ? (
              <span
                aria-hidden="true"
                className="absolute -end-1.5 -top-1 size-1.5 rounded-full bg-brand-bright"
              />
            ) : null}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
};
