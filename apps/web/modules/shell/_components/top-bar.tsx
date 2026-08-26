"use client";

import { MessageSquareText, PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { View } from "@/modules/shell/view";
import { Label } from "@/shared/_components/label";

export const TopBar = ({
  view,
  onViewChange,
  streamAvailable,
  onSearch,
  searchShortcut,
}: {
  view: View;
  onViewChange: (view: View) => void;
  streamAvailable: boolean;
  onSearch: () => void;
  searchShortcut: string;
}) => {
  const atHome = view === "home";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
      <Label>echo</Label>
      <div className="flex items-center gap-1">
        {/* The shortcut is printed on the control, which is how anyone learns it exists. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSearch}
          className="gap-2 text-muted-foreground"
        >
          <Search aria-hidden="true" />
          Search
          <Kbd className="ms-1 hidden sm:inline-flex">{searchShortcut}</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange(atHome ? "stream" : "home")}
          disabled={atHome && !streamAvailable}
          className="text-muted-foreground"
        >
          {atHome ? (
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
      </div>
    </header>
  );
};
