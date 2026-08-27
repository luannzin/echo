"use client";

import { useCallback, useMemo, useState } from "react";
import { type CaretPoint, caretPoint } from "@/shared/lib/caret-point";
import {
  applyCommand,
  matching,
  needsArgument,
  openArgument,
  readSlash,
  type SlashCommand,
  type SlashQuery,
} from "@/shared/lib/slash";

/**
 * The `/` menu, and the keys that answer it. A hook rather than props because both writing surfaces
 * need exactly the same behaviour, the same way they already share one definition of autosave and
 * one of completion.
 *
 * It never takes focus. The menu is a list beside the caret and the caret stays in the textarea, so
 * the writer keeps typing to narrow it — which is what makes it feel like part of the writing rather
 * than a dialog that happened.
 */
export const useSlash = ({
  surface,
  apply,
  run,
}: {
  surface: React.RefObject<HTMLTextAreaElement | null>;
  /** Puts these words on the surface, with the caret there. */
  apply: (text: string, caret: number) => void;
  /**
   * Does the thing a command does to the note. Only ever called for the ones that do, and given the
   * text as it now stands: the surface's own state is a render behind at this moment.
   */
  run: (command: SlashCommand, argument: string, text: string) => void;
}) => {
  const [query, setQuery] = useState<SlashQuery | null>(null);
  const [active, setActive] = useState(0);
  const [point, setPoint] = useState<CaretPoint>({ top: 0, left: 0, height: 0 });

  const commands = useMemo(() => {
    if (query === null) return [];
    const found = matching(query.name);
    // Once its words are being typed the command is already chosen. The list stops being a list —
    // it is the one command, and what matters below it is what echo makes of the words.
    return query.argument === null ? found : found.slice(0, 1);
  }, [query]);
  const open = query !== null && commands.length > 0;

  const close = useCallback(() => setQuery(null), []);

  /** Read on every keystroke and every caret move, because both can open and close the menu. */
  const refresh = useCallback(() => {
    const element = surface.current;
    if (!element) return;
    const next = readSlash(element.value, element.selectionStart);
    setQuery(next);
    if (next === null) return;
    setPoint(caretPoint(element));
    // A narrower list is a different list: keeping the old index would move the highlight under
    // the writer's hands while they type.
    setActive(0);
  }, [surface]);

  const pick = useCallback(
    (command: SlashCommand) => {
      const element = surface.current;
      if (!element || query === null) return;

      if (needsArgument(command, query)) {
        // Choosing `/category` is choosing the command, not filing an unnamed category. It becomes
        // a second step: the command is written out in full and the menu waits for its words.
        // Nothing to do where the writer is already there and has typed nothing yet.
        if (query.argument !== null) return;
        const opened = openArgument(element.value, query, element.selectionStart, command);
        apply(opened.text, opened.caret);
        setQuery({ start: query.start, name: command.id, argument: "" });
        setActive(0);
        return;
      }

      const written = applyCommand(element.value, query, element.selectionStart, command);
      apply(written.text, written.caret);
      if (command.action.kind === "note") run(command, query.argument ?? "", written.text);
      setQuery(null);
    },
    [surface, query, apply, run],
  );

  /**
   * Whether the key was spent here. Callers ask this first: while the menu is open Enter chooses
   * from it, and only a closed menu lets Enter mean what it usually means.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!open || event.nativeEvent.isComposing) return false;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((current) => (current + step + commands.length) % commands.length);
        return true;
      }

      // Space takes the command too: naming one and reaching for the next word is agreeing to it.
      // Only while its own name is being typed — inside an argument a space is a space — and never
      // on a bare `/`, which is somebody writing a slash rather than choosing the first thing shown.
      const spaceTakes =
        event.key === " " && query !== null && query.argument === null && query.name.length > 0;

      if (event.key === "Enter" || event.key === "Tab" || spaceTakes) {
        const chosen = commands[active];
        if (chosen === undefined) return false;
        event.preventDefault();
        pick(chosen);
        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return true;
      }

      return false;
    },
    [open, commands, active, query, pick, close],
  );

  return { open, commands, active, query, point, refresh, close, pick, onKeyDown };
};
