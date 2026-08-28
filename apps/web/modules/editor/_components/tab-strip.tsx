"use client";

import type { Note } from "@echo/types";
import { Pin, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MenuNote } from "@/shared/_components/menu-note";
import { copy } from "@/shared/lib/i18n";

/**
 * How close to an end of the strip a dragged tab has to be held before the strip starts moving under
 * it, and how fast it then moves, in pixels a frame. Wide enough to hit without aiming, narrow
 * enough that dropping onto the first or last tab is still a thing you can do.
 */
const EDGE = 48;
const DRIFT = 12;

/**
 * The notes you have open, in the order you opened them or the order you dragged them into. Nothing
 * about a note moves its tab — a stream sorted by when you last touched something is what the other
 * mode is for.
 */
export const TabStrip = ({
  session,
  noteOf,
  active,
  secondary,
  onSelect,
  onClose,
  onMove,
  onPin,
}: {
  session: readonly string[];
  noteOf: (noteId: string) => Note | undefined;
  active: string | null;
  /** What the second pane is showing, so a split names both of its notes in the strip. */
  secondary: string | null;
  onSelect: (noteId: string) => void;
  onClose: (noteId: string) => void;
  onMove: (noteId: string, targetId: string) => void;
  /** Lifts the tab off the window and onto the desktop as a sticky note. Absent off the desktop. */
  onPin?: (noteId: string) => void;
}) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const strip = useRef<HTMLElement>(null);
  /** Which way the strip is drifting under a held tab: -1 left, 1 right, 0 not at an edge. */
  const edge = useRef(0);
  const drifting = useRef<number | null>(null);

  const stopDrift = useCallback(() => {
    edge.current = 0;
    if (drifting.current !== null) cancelAnimationFrame(drifting.current);
    drifting.current = null;
  }, []);

  /**
   * With more tabs open than fit, the one you want to drop next to is off the side of the window —
   * and a drag cannot scroll the strip the way a wheel can, because the pointer is holding a tab.
   * So holding the tab near either end scrolls the strip under it, the way a file manager does.
   *
   * A frame loop rather than the `dragover` event: that event only fires while the pointer moves,
   * and the gesture this is for is a pointer held still against the edge.
   */
  const drift = useCallback(() => {
    const element = strip.current;
    if (element !== null && edge.current !== 0) element.scrollLeft += edge.current * DRIFT;
    drifting.current = requestAnimationFrame(drift);
  }, []);

  // Nothing is left running when the strip goes: a loop outliving its component would scroll a node
  // that is no longer on the page, forever.
  useEffect(() => stopDrift, [stopDrift]);

  return (
    // The scrollbar is hidden rather than styled: it is drawn over the tabs on the platforms that
    // overlay it, so the strip grew a bar under the pointer exactly when the pointer was aiming at
    // a tab. The strip still scrolls — the wheel, the tab that scrolls itself into view, and a tab
    // dragged to either end do it.
    <nav
      ref={strip}
      // A landmark, and named: moving between the notes you have open is navigation, and it is now
      // a drop target too — one a screen reader could not otherwise name.
      aria-label={copy().editor.openNotes}
      onDragOver={(event) => {
        // Answered on the strip and not only on the tabs, so the gap past the last tab and the
        // space above them still count as being at the edge.
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        edge.current =
          event.clientX < box.left + EDGE ? -1 : event.clientX > box.right - EDGE ? 1 : 0;
        if (edge.current !== 0 && drifting.current === null)
          drifting.current = requestAnimationFrame(drift);
      }}
      // `dragleave` fires on the strip when the pointer crosses onto a tab inside it, so leaving is
      // asked about rather than assumed — otherwise the drift stops every time the tab under the
      // pointer changes, which is constantly.
      onDragLeave={(event) => {
        const to = event.relatedTarget;
        if (to instanceof Node && event.currentTarget.contains(to)) return;
        stopDrift();
      }}
      onDragEnd={stopDrift}
      onDrop={(event) => {
        // Dropped on the strip itself rather than on a tab: nothing moves, and the browser is told
        // so, because accepting the drag above made this a drop target.
        event.preventDefault();
        stopDrift();
      }}
      className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {session.map((noteId) => (
        <Tab
          key={noteId}
          noteId={noteId}
          title={noteOf(noteId)?.title || copy().editor.newNoteTab}
          active={noteId === active}
          beside={noteId === secondary}
          dragging={noteId === dragging}
          over={over === noteId && dragging !== null && dragging !== noteId}
          onSelect={onSelect}
          onClose={onClose}
          onPin={onPin}
          onDragStart={() => setDragging(noteId)}
          onDragEnd={() => {
            stopDrift();
            setDragging(null);
            setOver(null);
          }}
          onDragOver={() => setOver(noteId)}
          onDrop={() => {
            stopDrift();
            if (dragging) onMove(dragging, noteId);
            setDragging(null);
            setOver(null);
          }}
        />
      ))}
    </nav>
  );
};

const Tab = memo(
  ({
    noteId,
    title,
    active,
    beside,
    dragging,
    over,
    onSelect,
    onClose,
    onPin,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
  }: {
    noteId: string;
    title: string;
    active: boolean;
    beside: boolean;
    dragging: boolean;
    over: boolean;
    onSelect: (noteId: string) => void;
    onClose: (noteId: string) => void;
    onPin?: (noteId: string) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: () => void;
    onDrop: () => void;
  }) => {
    const shell = useRef<HTMLDivElement>(null);

    // A new note is opened at the end of a strip that may already be wider than the window, so the
    // tab brings itself into view. `nearest` on both axes: this must never scroll anything but the
    // strip, and a tab already on screen must not be moved under the pointer.
    useEffect(() => {
      if (active) shell.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }, [active]);

    return (
      <ContextMenu>
        {/*
          The close control cannot live inside the tab's own button, so the two sit side by side in
          a wrapper that only draws. Every handler is on a real control: the name carries the drag,
          the same way a folder row does. The wrapper is what the right click lands on, so the menu
          answers anywhere across the tab.
        */}
        <ContextMenuTrigger
          render={<div ref={shell} />}
          className={`group flex min-w-0 shrink-0 items-center gap-1 rounded-t-lg ps-1.5 transition-[background-color,opacity,box-shadow] duration-150 ${
            active || beside ? "bg-card" : "hover:bg-card/50"
          } ${dragging ? "opacity-40" : ""} ${
            over ? "shadow-[inset_2px_0_0_0_var(--color-brand-bright)]" : ""
          }`}
        >
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", title);
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            onDragOver={(event) => {
              event.preventDefault();
              onDragOver();
            }}
            onDrop={(event) => {
              event.preventDefault();
              onDrop();
            }}
            onClick={() => onSelect(noteId)}
            // Middle click closes it, the way it closes a browser tab. `onMouseDown` is where the
            // autoscroll cursor would otherwise open, and it opens before the click ever lands.
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClick={(event) => {
              if (event.button !== 1) return;
              event.preventDefault();
              onClose(noteId);
            }}
            aria-current={active ? "page" : undefined}
            title={title}
            className={`max-w-52 truncate rounded-md py-2.5 pe-1 ps-2 text-start text-[0.8125rem] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
              active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            }`}
          >
            {title}
          </button>
          <button
            type="button"
            aria-label={copy().editor.closeNamed(title)}
            onClick={() => onClose(noteId)}
            // Always reachable by keyboard, and on a phone, where there is no hover to reveal it.
            className="me-1.5 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity duration-150 pointer-coarse:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </ContextMenuTrigger>

        <ContextMenuPopup align="start" className="max-w-64">
          {onPin === undefined ? null : (
            <ContextMenuItem closeOnClick onClick={() => onPin(noteId)}>
              <Pin aria-hidden="true" />
              {copy().editor.pinToDesktop}
            </ContextMenuItem>
          )}
          <ContextMenuItem closeOnClick onClick={() => onClose(noteId)}>
            <X aria-hidden="true" />
            {copy().editor.closeTab}
          </ContextMenuItem>
          {onPin === undefined ? null : <MenuNote>{copy().editor.stickyNoteHint}</MenuNote>}
        </ContextMenuPopup>
      </ContextMenu>
    );
  },
);
Tab.displayName = "Tab";
