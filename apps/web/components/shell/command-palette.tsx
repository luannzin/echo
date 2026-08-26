"use client";

import type { Note } from "@echo/types";
import { type LucideIcon, NotebookPen } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { formatStamp } from "@/lib/time";

export type PaletteCommand = {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Words a reader might type to reach a command whose label they cannot remember. */
  keywords?: string;
  run: () => void;
};

export type Found = { note: Note; score: number };

type Row =
  | { value: string; kind: "command"; command: PaletteCommand }
  | { value: string; kind: "note"; note: Note };

type Group = { value: string; items: Row[] };

/**
 * One place to reach everything: a note by what it is about, or a command by its name. Search here
 * is the same hybrid ranking the rest of the product uses — meaning first, words second — so a note
 * can be found by describing it rather than by quoting it.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  onSearch,
  onOpenNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
  /** Runs behind the typing. Returns the notes that match, best first. */
  onSearch: (query: string) => Promise<Found[]>;
  onOpenNote: (noteId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  /** Search runs on a local database. When that database cannot be opened, say so. */
  const [unavailable, setUnavailable] = useState(false);
  // Retrieval rides behind the keystroke, the same way it does in the composer.
  const settled = useDeferredValue(query);

  // A palette that remembers the last question is a palette that answers the wrong one.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setFound([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const text = settled.trim();
    if (text.length === 0) {
      setFound([]);
      setSearching(false);
      return;
    }

    let current = true;
    setSearching(true);
    const timer = setTimeout(() => {
      void onSearch(text)
        .then((results) => {
          if (!current) return;
          setFound(results);
          setUnavailable(false);
        })
        .catch(() => current && setUnavailable(true))
        .finally(() => current && setSearching(false));
    }, 160);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [settled, open, onSearch]);

  const groups = useMemo<Group[]>(() => {
    const text = query.trim().toLowerCase();
    const matching = commands.filter(
      (command) =>
        text.length === 0 ||
        `${command.label} ${command.keywords ?? ""}`.toLowerCase().includes(text),
    );

    const noteRows: Row[] = found.map((hit) => ({
      value: hit.note.id,
      kind: "note",
      note: hit.note,
    }));
    const commandRows: Row[] = matching.map((command) => ({
      value: command.id,
      kind: "command",
      command,
    }));

    // With a question typed, notes are the answer and commands are the afterthought. Empty, it is
    // the other way round: nothing has been asked yet, so the palette offers what it can do.
    return (
      text.length > 0
        ? [
            { value: "Notes", items: noteRows },
            { value: "Commands", items: commandRows },
          ]
        : [{ value: "Commands", items: commandRows }]
    ).filter((group) => group.items.length > 0);
  }, [commands, found, query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Near-instant on purpose. A palette is opened dozens of times a day from the keyboard, and
          waiting for it to arrive is the one thing it must never do. */}
      <CommandDialogPopup className="duration-100" aria-label="Search and commands">
        <Command items={groups} mode="none" value={query} onValueChange={setQuery}>
          <CommandInput placeholder="Search notes, or type a command…" />
          <CommandEmpty>
            {searching
              ? "Looking…"
              : unavailable
                ? "Search needs the local database, which could not be opened. Reload the page to try again."
                : query.trim()
                  ? "Nothing matches that."
                  : null}
          </CommandEmpty>
          <CommandList>
            {(group: Group) => (
              <CommandGroup key={group.value} items={group.items}>
                <CommandGroupLabel>{group.value}</CommandGroupLabel>
                <CommandCollection>
                  {(row: Row) =>
                    row.kind === "command" ? (
                      <CommandItem
                        key={row.value}
                        value={row}
                        onClick={() => {
                          onOpenChange(false);
                          row.command.run();
                        }}
                        className="gap-2.5"
                      >
                        {/* Sized here rather than inherited: the list primitive sets no icon size,
                            and a Lucide icon left alone renders at 24px beside 14px text. */}
                        <row.command.icon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{row.command.label}</span>
                        {row.command.shortcut ? (
                          <CommandShortcut>{row.command.shortcut}</CommandShortcut>
                        ) : null}
                      </CommandItem>
                    ) : (
                      <CommandItem
                        key={row.value}
                        value={row}
                        onClick={() => {
                          onOpenChange(false);
                          onOpenNote(row.note.id);
                        }}
                        className="items-start gap-2.5 py-2"
                      >
                        <NotebookPen
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate">{row.note.title || "Untitled"}</span>
                          {/* Only when it adds something: a one-line note is its own title, and
                              printing it twice tells the reader nothing they cannot see already. */}
                          {body(row.note.content) ? (
                            <span className="truncate text-muted-foreground text-xs">
                              {body(row.note.content)}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                          {formatStamp(row.note.updatedAt)}
                        </span>
                      </CommandItem>
                    )
                  }
                </CommandCollection>
              </CommandGroup>
            )}
          </CommandList>
          <CommandFooter>
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move · <Kbd>Enter</Kbd> to open
            </span>
            <span>Searched on this device</span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}

/** Everything after the line the title came from, and nothing when the note is a single line. */
function body(content: string): string {
  const [, ...rest] = content.split("\n");
  return rest.join(" ").trim().slice(0, 120);
}
