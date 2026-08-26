"use client";

import type { EmbedderStatus } from "@echo/embeddings";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { AlsoMean } from "@/modules/search/_components/also-mean";
import { PaletteAction } from "@/modules/search/_components/palette-action";
import { PaletteNote } from "@/modules/search/_components/palette-note";
import { QueryChips } from "@/modules/search/_components/query-chips";
import {
  describePass,
  groupRows,
  type PaletteCommand,
  type PaletteGroup,
  type PaletteRow,
  queryTerms,
  type SearchPass,
} from "@/modules/search/model";
import type { Suggestion } from "@/shared/lib/retrieval";

/** Short: the first pass is a lookup, not a scan. This skips keystrokes rather than buying time. */
const SETTLE_MS = 90;

/**
 * One place to reach everything: a note by what it is about, or a command by its name.
 *
 * Search arrives in two passes — words from the database's own index in a few milliseconds, then
 * meaning a moment later, which re-orders them. Nothing here ever waits on the model.
 */
export const CommandPalette = ({
  open,
  onOpenChange,
  commands,
  onSearch,
  onOpenNote,
  onSuggest,
  onRejectAlias,
  model,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
  /** Calls back once per pass, best first. */
  onSearch: (
    query: string,
    ignoring: ReadonlySet<"period" | "place">,
    receive: (pass: SearchPass) => void,
  ) => Promise<void>;
  onOpenNote: (noteId: string) => void;
  /** The reader's own other words for what they typed. Synchronous: it is a lookup in memory. */
  onSuggest: (query: string) => Suggestion[];
  /** Two words echo took for one thing that are not. Called with what was typed and what it offered. */
  onRejectAlias: (typed: string, offered: string) => void;
  model: EmbedderStatus;
}) => {
  const [query, setQuery] = useState("");
  const [pass, setPass] = useState<SearchPass | null>(null);
  const [searching, setSearching] = useState(false);
  /** Search runs on a local database. When that database cannot be opened, say so. */
  const [unavailable, setUnavailable] = useState(false);
  /** Filters the reader has taken back. Cleared with the question they belonged to. */
  const [ignoring, setIgnoring] = useState<ReadonlySet<"period" | "place">>(() => new Set());
  // Retrieval rides behind the keystroke, the same way it does in the composer.
  const settled = useDeferredValue(query);
  /** Which question the results belong to, so a late answer cannot overwrite a newer one. */
  const asked = useRef(0);

  // A palette that remembers the last question is a palette that answers the wrong one.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setPass(null);
    setIgnoring(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const text = settled.trim();
    if (text.length === 0) {
      setPass(null);
      setSearching(false);
      return;
    }

    const question = ++asked.current;
    let current = true;
    setSearching(true);

    const timer = setTimeout(() => {
      void onSearch(text, ignoring, (next) => {
        if (!current || question !== asked.current) return;
        setPass(next);
        setUnavailable(false);
      })
        .catch(() => current && setUnavailable(true))
        .finally(() => current && setSearching(false));
    }, SETTLE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [settled, open, ignoring, onSearch]);

  const groups = useMemo(
    () => groupRows(commands, pass?.results ?? [], query),
    [commands, pass, query],
  );
  const terms = useMemo(() => queryTerms(query), [query]);
  // Behind the keystroke like the search itself, so honing a word never costs a frame.
  const suggestions = useMemo(() => onSuggest(settled), [settled, onSuggest]);

  const emptyMessage = searching
    ? "Looking…"
    : unavailable
      ? "Search needs the local database, which could not be opened. Reload the page to try again."
      : query.trim()
        ? "Nothing matches that."
        : null;

  const renderRow = (row: PaletteRow) =>
    row.kind === "command" ? (
      <PaletteAction
        key={row.value}
        row={row}
        command={row.command}
        onRun={() => {
          onOpenChange(false);
          row.command.run();
        }}
      />
    ) : (
      <PaletteNote
        key={row.value}
        row={row}
        result={row.result}
        terms={terms}
        onOpen={() => {
          onOpenChange(false);
          onOpenNote(row.result.note.id);
        }}
      />
    );

  const renderGroup = (group: PaletteGroup) => (
    <CommandGroup key={group.value} items={group.items}>
      <CommandGroupLabel>{group.value}</CommandGroupLabel>
      <CommandCollection>{renderRow}</CommandCollection>
    </CommandGroup>
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Near-instant on purpose. A palette is opened dozens of times a day from the keyboard, and
          waiting for it to arrive is the one thing it must never do. */}
      <CommandDialogPopup className="duration-100" aria-label="Search and commands">
        <Command items={groups} mode="none" value={query} onValueChange={setQuery}>
          <CommandInput placeholder="Search notes, or type a command…" />
          {/* Above the answers rather than beside them: it is a question about the question. */}
          <AlsoMean
            suggestions={suggestions}
            onChoose={(text) =>
              setQuery(`${query.slice(0, query.trimEnd().lastIndexOf(" ") + 1)}${text}`)
            }
            onReject={(text) => onRejectAlias(settled, text)}
          />
          {pass ? (
            <QueryChips
              query={pass.query}
              ignoring={ignoring}
              filtered={pass.filtered}
              onToggle={(filter) =>
                setIgnoring((current) => {
                  const next = new Set(current);
                  if (!next.delete(filter)) next.add(filter);
                  return next;
                })
              }
            />
          ) : null}
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandList>{renderGroup}</CommandList>
          <CommandFooter>
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move · <Kbd>Enter</Kbd> to open
            </span>
            {/* What the answer was made of. A reader whose model is still arriving should know the
                list is going to get better, not wonder why it is not better already. */}
            <span aria-live="polite">{describePass(pass, model)}</span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
};
