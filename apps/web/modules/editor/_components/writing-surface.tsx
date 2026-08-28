"use client";

import { parse } from "@echo/parser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FindBar } from "@/modules/editor/_components/find-bar";
import {
  type History,
  historyOf,
  keepHistory,
  record,
  redo,
  undo,
  undoableAt,
} from "@/modules/editor/history";
import { lineAtOffset } from "@/modules/editor/markdown";
import { readPlace, writePlace } from "@/modules/editor/session";
import { GhostText } from "@/shared/_components/ghost-text";
import { SlashMenu } from "@/shared/_components/slash-menu";
import { slashOptionId } from "@/shared/_components/slash-option";
import { useCompletion } from "@/shared/lib/completion";
import { copy } from "@/shared/lib/i18n";
import { isFindChord, isRedoChord, isUndoChord } from "@/shared/lib/shortcuts";
import type { Filing, SlashCommand } from "@/shared/lib/slash";
import { formatDue } from "@/shared/lib/time";
import { useSlash } from "@/shared/lib/use-slash";

const MENU_ID = "note-commands";

/**
 * The page you write a note on, wherever the note is being written.
 *
 * There are two places: the pane in the simpler mode, and the note opened out of the stream in the
 * full app. They are framed differently — one has tabs above it, the other a folder path and a
 * delete — and what happens *inside* them is the same thing, so it is one component and not two.
 * It was two, and the second one silently kept none of what the first grew: no slash commands, no
 * undo that survived closing the note, no find, no memory of the line you were on.
 *
 * The words themselves belong to the caller, which is what owns autosave and therefore what can
 * say whether the note is saved. This owns everything the caret does.
 */
export const WritingSurface = ({
  noteId,
  initial,
  draft,
  setDraft,
  className,
  focused = true,
  complete,
  onWrite,
  undoableAt: appUndoAt,
  onUndo,
  onNotice,
  onFile,
  onEscape,
}: {
  noteId: string;
  /** The words the note already had, which is what this note's undo history starts from. */
  initial: string;
  draft: string;
  setDraft: (text: string) => void;
  /** Shared with the suggestion drawn behind the text; they only line up while they agree. */
  className: string;
  /** Whether this is the surface being written in. A split has two, and one caret. */
  focused?: boolean;
  /** Finishes the sentence from the reader's own writing. Absent until the database has opened. */
  complete?: (text: string) => string;
  /** Told what is written and which line the caret is on. Only given when something is watching. */
  onWrite?: (text: string, line: number) => void;
  /** When the app's own next undo step happened. Absent when it has nothing to take back. */
  undoableAt?: number;
  /** Takes the app's step back and names it. */
  onUndo?: () => string | null;
  /** Says what a keystroke just did, where the writer can read it. */
  onNotice?: (message: string) => void;
  /**
   * Files what a slash command asked for. The note is written first, because a task cannot belong
   * to a note that is not there yet — a tab nobody has typed into is an id and nothing else.
   */
  onFile?: (noteId: string, text: string, ask: Filing) => void;
  /** What Escape means here, once the suggestion and the find box have had their turn at it. */
  onEscape?: () => void;
}) => {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const completion = useCompletion(textarea, complete);
  /**
   * The find box, when it is open. `at` is when Ctrl F was last pressed, and it keys the box — so
   * pressing the chord again while it is already open re-opens it on whatever is selected now,
   * rather than leaving a stale word sitting in a field that has just taken focus.
   */
  const [finding, setFinding] = useState<{ initial: string; at: number } | null>(null);

  /**
   * This note's own undo history, taken from outside the component so that walking away and coming
   * back does not empty it. The browser's stack belongs to the textarea element, and the element is
   * remounted every time another note is opened — which is precisely when someone reaches for
   * Ctrl Z.
   */
  const history = useRef<History>(historyOf(noteId, initial, initial.length));

  /** Every change a person made, which is the only kind worth being able to take back. */
  const edit = useCallback(
    (text: string, caret: number) => {
      history.current = record(history.current, { text, caret }, Date.now());
      keepHistory(noteId, history.current);
      setDraft(text);
    },
    [noteId, setDraft],
  );

  const slash = useSlash({
    surface: textarea,
    apply: (text, caret) => {
      // Through `edit`, not `setDraft`: a command is a change like any other, and Ctrl Z has to
      // reach back past it.
      edit(text, caret);
      completion.reset();
      requestAnimationFrame(() => textarea.current?.setSelectionRange(caret, caret));
    },
    run: (command: SlashCommand, argument: string, text: string) => {
      if (command.action.kind !== "note") return;
      const ask: Filing =
        command.action.note === "task"
          ? { task: true }
          : command.action.note === "due"
            ? { task: true, dueAt: parse(argument).dates[0]?.date }
            : { category: argument.trim() };
      // A date echo cannot read is not a date, and an unnamed category is not a category.
      if (command.action.note === "due" && ask.dueAt === undefined) {
        onNotice?.(copy().composer.noDateYet);
        return;
      }
      if (command.action.note === "category" && ask.category === "") {
        onNotice?.(copy().composer.nameTheCategory);
        return;
      }
      onFile?.(noteId, text, ask);
    },
  });

  /**
   * Where the reader is inside this note, kept so that opening it again is continuing it. Written
   * from the element rather than from React state because a caret moves without the text changing,
   * and it is the caret this is about.
   */
  const remember = useCallback(() => {
    const element = textarea.current;
    if (element) writePlace(noteId, { caret: element.selectionStart, scroll: element.scrollTop });
  }, [noteId]);

  // Where the caret is, for whatever is following it — the preview, today. Reported from the
  // element rather than from React state because the caret moves without the text changing.
  const report = useCallback(() => {
    const element = textarea.current;
    if (element) onWrite?.(element.value, lineAtOffset(element.value, element.selectionStart));
    remember();
  }, [onWrite, remember]);

  /** Puts a step from the history on screen, caret and all. False when there was no step to take. */
  const walk = useCallback(
    (next: History | null): boolean => {
      if (next === null) return false;
      history.current = next;
      keepHistory(noteId, next);
      setDraft(next.present.text);
      completion.reset();
      // After the state has landed: setting the range against the old value drops the caret in the
      // middle of words that are no longer there.
      requestAnimationFrame(() => {
        const element = textarea.current;
        if (!element) return;
        element.setSelectionRange(next.present.caret, next.present.caret);
        report();
      });
      return true;
    },
    [noteId, setDraft, completion.reset, report],
  );

  /**
   * Ctrl Z, arbitrated. There is no ranking between a note that was deleted and a paragraph that
   * was erased — they are two things that happened, and the keystroke undoes whichever happened
   * last. Both sides are asked when they happened; the later one answers.
   */
  const takeBack = useCallback(() => {
    const mine = undoableAt(history.current);
    if (mine !== null && (appUndoAt === undefined || mine >= appUndoAt)) {
      // Named for what the writer did, not for what the step does: taking back an erasure puts
      // words on the screen, and being told "took back" while words appear reads as a bug.
      const erased = history.current.past.at(-1);
      const putting = (erased?.text.length ?? 0) > history.current.present.text.length;
      walk(undo(history.current));
      const said = copy().editor;
      onNotice?.(putting ? said.reopenedWhatYouErased : said.tookBackWhatYouWrote);
      return;
    }
    const label = onUndo?.() ?? null;
    const said = copy().editor;
    onNotice?.(label === null ? said.nothingLeftToTakeBack : said.tookBack(label));
  }, [appUndoAt, onUndo, onNotice, walk]);

  /** Only the words have a way forward: nothing the app takes back can be put back by a keystroke. */
  const putForward = useCallback(() => {
    const said = copy().editor;
    onNotice?.(walk(redo(history.current)) ? said.putItBack : said.nothingToPutForward);
  }, [walk, onNotice]);

  // Typing, and the first paint after something starts watching a note already full of words.
  useEffect(() => {
    onWrite?.(draft, lineAtOffset(draft, textarea.current?.selectionStart ?? draft.length));
  }, [draft, onWrite]);

  /**
   * Opening a note means continuing it: the caret goes back to the line it was left on and the page
   * back to where it was scrolled under it. A note nobody has been inside has no such place, and
   * there "continuing it" means after the last character.
   *
   * The caret is clamped because the words can have changed since — a note edited on the sticky
   * note, or on another device once sync lands, comes back shorter than the offset stored for it.
   */
  useEffect(() => {
    const element = textarea.current;
    if (!element || !focused) return;
    const place = readPlace(noteId);
    const caret = Math.min(place?.caret ?? element.value.length, element.value.length);
    element.focus();
    element.setSelectionRange(caret, caret);
    element.scrollTop = place === null ? element.scrollHeight : place.scroll;
    // Focus is claimed when this becomes the surface being written in, not on every render.
  }, [focused, noteId]);

  /**
   * Ctrl F. Claimed from the window rather than from the writing surface, so it answers whether the
   * caret is in the note or on the tab that was just clicked — and only in the surface being
   * written in, because a split has two of these and one keystroke means one of them.
   */
  useEffect(() => {
    if (!focused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isFindChord(event)) return;
      event.preventDefault();
      const element = textarea.current;
      const picked = element?.value.slice(element.selectionStart, element.selectionEnd) ?? "";
      // A whole paragraph dragged over is not a word anybody meant to search for.
      setFinding({ initial: picked.includes("\n") ? "" : picked, at: performance.now() });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused]);

  /**
   * Puts the writing surface on a match, and scrolls it there.
   *
   * A browser will not scroll a textarea to a *range* set from script — only to a caret the element
   * is regaining focus on. So the match is reached as a caret first and only then opened out into
   * the selection that shows it. Which is also what gets soft-wrapped lines right, where arithmetic
   * over the line height would not: the browser knows where a wrapped line ended up, and we do not.
   *
   * Focus goes back where it came from at the end, so the reader never leaves the field they are
   * typing the word into.
   */
  const goTo = useCallback(
    (start: number, end: number) => {
      const element = textarea.current;
      if (!element) return;
      const held = document.activeElement;
      element.focus();
      element.setSelectionRange(start, start);
      element.blur();
      element.focus();
      element.setSelectionRange(start, end);
      if (held instanceof HTMLElement && held !== element) held.focus();
      // Said rather than left to be noticed: a selection moved from script does not always reach
      // React's own `onSelect`, and finding a word is exactly as much "where I am in this note" as
      // clicking on it is.
      report();
    },
    [report],
  );

  /** What echo makes of the argument being typed, said under the list before it is pressed. */
  const reading = useMemo(() => {
    const query = slash.query;
    if (query === null || query.argument === null) return null;
    if (query.name === "due") {
      const said = copy().composer;
      if (query.argument.trim().length === 0) return said.whenPlaceholder;
      const when = parse(query.argument).dates[0];
      return when ? said.due(formatDue(when.date)) : said.noDateYet;
    }
    if (query.name === "category") {
      const said = copy().composer;
      const name = query.argument.trim();
      return name.length === 0 ? said.nameTheCategory : said.addCategory(name);
    }
    return null;
  }, [slash.query]);

  return (
    <>
      {finding === null ? null : (
        <FindBar
          key={finding.at}
          text={draft}
          initial={finding.initial}
          onGo={goTo}
          onClose={() => {
            setFinding(null);
            // The caret is already on the match, so closing leaves the reader where they looked.
            textarea.current?.focus();
          }}
        />
      )}
      <GhostText
        text={draft}
        suggestion={slash.open ? "" : completion.ghost}
        className={className}
        from={textarea}
      />
      <textarea
        ref={textarea}
        value={draft}
        onChange={(event) => {
          edit(event.target.value, event.target.selectionStart);
          completion.refresh();
          slash.refresh();
        }}
        onSelect={() => {
          completion.refresh();
          slash.refresh();
          report();
        }}
        // The page moving under a still caret is half of where the reader was.
        onScroll={remember}
        onKeyDown={(event) => {
          // The menu answers first: while it is open, Enter is choosing from it.
          if (slash.onKeyDown(event)) return;
          if (completion.onKeyDown(event, (text) => edit(text, text.length))) return;
          if (event.key === "Escape") {
            // The find box goes before the surface around it does: one Escape, one thing closed.
            if (finding !== null) {
              event.preventDefault();
              setFinding(null);
              return;
            }
            if (onEscape === undefined) return;
            event.preventDefault();
            onEscape();
            return;
          }
          const undoing = isUndoChord(event.nativeEvent);
          if (!undoing && !isRedoChord(event.nativeEvent)) return;
          // Always taken from the browser, even when there is nothing left to take back: its own
          // stack and this one would otherwise disagree about what the note said. Stopped from
          // the window too, because the page holds the same chord and this surface has just
          // decided between them.
          event.preventDefault();
          event.stopPropagation();
          if (undoing) takeBack();
          else putForward();
        }}
        aria-label={copy().composer.noteContent}
        role="combobox"
        aria-expanded={slash.open}
        aria-controls={MENU_ID}
        aria-autocomplete="list"
        aria-activedescendant={slash.open ? slashOptionId(MENU_ID, slash.active) : undefined}
        placeholder={copy().composer.writeAnything}
        spellCheck={false}
        className={`relative ${className} outline-none placeholder:text-muted-foreground`}
      />

      {slash.open ? (
        <SlashMenu
          id={MENU_ID}
          commands={slash.commands}
          active={slash.active}
          argument={slash.query?.argument ?? null}
          point={slash.point}
          room={textarea.current?.clientWidth ?? 0}
          reading={reading}
          onPick={slash.pick}
        />
      ) : null}
    </>
  );
};
