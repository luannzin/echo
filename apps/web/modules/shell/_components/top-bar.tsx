"use client";

import { Brain, MessageSquareText, PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { View } from "@/modules/shell/view";
import { Label } from "@/shared/_components/label";

export const TopBar = ({
  view,
  onViewChange,
  streamAvailable,
  intelligenceOpen,
  onToggleIntelligence,
  onSearch,
  searchShortcut,
}: {
  view: View;
  onViewChange: (view: View) => void;
  streamAvailable: boolean;
  /** The rail carries this toggle from lg up, where the panel is a column. Below that, it lives
   *  here, because that is where the reader can reach it. */
  intelligenceOpen: boolean;
  onToggleIntelligence: () => void;
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
          <span className="hidden sm:inline">Search</span>
          <Kbd className="ms-1 hidden sm:inline-flex">{searchShortcut}</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleIntelligence}
          aria-label={intelligenceOpen ? "Hide related notes" : "Show related notes"}
          aria-pressed={intelligenceOpen}
          className="text-muted-foreground lg:hidden"
        >
          <Brain aria-hidden="true" />
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
