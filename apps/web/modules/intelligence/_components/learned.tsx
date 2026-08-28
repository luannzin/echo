"use client";

import { folderPath } from "@echo/core";
import { CONFIDENT, type LearnedRule } from "@echo/learning";
import type { Folder } from "@echo/types";
import { Undo2 } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { copy } from "@/shared/lib/i18n";
import { quiet } from "@/shared/lib/styles";

/**
 * A learned rule, as one finished sentence.
 *
 * This used to be a subject and a predicate glued together at the render site, which is a rule of
 * English grammar wearing a function: Portuguese puts the folder at the *end* of the same sentence
 * (`notas assim vão para Trabalho/Auth`), and no amount of reordering at the call site can fix a
 * sentence that was already built. So the dictionary owns the whole thing, and this only decides
 * which of its sentences is true.
 */
const sentenceOf = (rule: LearnedRule, folders: Folder[]): string => {
  const words = copy().intelligence.rule;
  const accepted = rule.outcome === "accept";

  if (rule.kind === "destination") {
    const place = folderPath(folders, rule.subject);
    return accepted ? words.destinationAccept(place) : words.destinationReject(place);
  }
  // An alias is a pair, filed under both words at once.
  if (rule.kind === "alias") {
    const [first = "", second = ""] = rule.subject.split("|");
    return accepted ? words.aliasAccept(first, second) : words.aliasReject(first, second);
  }
  // A concept rule is about one note, and the note is not what the reader is being told about.
  if (rule.kind === "concept") {
    const concept = rule.subject.split(":").slice(1).join(":");
    return accepted ? words.conceptAccept(concept) : words.conceptReject(concept);
  }
  if (rule.kind === "task-phrase") {
    return accepted ? words.taskPhraseAccept(rule.subject) : words.taskPhraseReject(rule.subject);
  }
  return accepted ? words.datePhraseAccept(rule.subject) : words.datePhraseReject(rule.subject);
};

/** The parts of the sentence that are the reader's own words, wherever the language put them. */
const subjectsOf = (rule: LearnedRule, folders: Folder[]): string[] => {
  if (rule.kind === "destination") return [folderPath(folders, rule.subject)];
  if (rule.kind === "alias") {
    const [first = "", second = ""] = rule.subject.split("|");
    return [`“${first}”`, `“${second}”`];
  }
  if (rule.kind === "concept") return [`“${rule.subject.split(":").slice(1).join(":")}”`];
  return [`“${rule.subject}”`];
};

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Lights the reader's own words inside the sentence, wherever in it they ended up.
 *
 * A search over the finished sentence rather than a slot in a template, because the slot moves: the
 * folder is the first word in English and the last in Portuguese. The subjects are literal
 * substrings of the sentence by construction, so this is a highlight and never a rewrite.
 */
const lit = (sentence: string, subjects: readonly string[]): ReactNode => {
  const found = subjects.filter((subject) => subject.length > 0);
  if (found.length === 0) return sentence;

  const pattern = new RegExp(`(${found.map(escapeRegex).join("|")})`, "g");
  // The index is the key, and it is the right one: these are positions in one sentence that is
  // re-split from scratch whenever it changes, so nothing is ever reordered under a key.
  return sentence.split(pattern).map((piece, index) =>
    found.includes(piece) ? (
      <span key={index} className="text-foreground">
        {piece}
      </span>
    ) : (
      <Fragment key={index}>{piece}</Fragment>
    ),
  );
};

/**
 * What echo has worked out about the way this reader writes — in their own words, never as a score.
 * Everything here is undoable, because a system that learns without an undo is one that is slowly
 * deciding things on your behalf.
 */
export const Learned = ({
  rules,
  folders,
  onForget,
}: {
  rules: LearnedRule[];
  /** So a rule about a place can name the place rather than the row it lives in. */
  folders: Folder[];
  onForget: (rule: LearnedRule) => void;
}) => {
  const words = copy().intelligence;

  /**
   * A single correction is a coincidence, and nothing *inferred* is claimed as learned until it
   * repeats. Aliases and concepts are the exception, and not by relaxing the rule: they are not
   * inferred from a correction, they *are* the correction — the reader pressed × on a claim echo
   * put in front of them, which is a statement rather than a pattern. Search obeys it at once, so
   * it has to be visible and undoable at once too, or a refusal is a change nobody can take back.
   */
  const stated = (rule: LearnedRule) => rule.kind === "alias" || rule.kind === "concept";
  const settled = rules.filter(
    (rule) =>
      (rule.confidence >= CONFIDENT || stated(rule)) &&
      rule.kind !== "note" &&
      rule.kind !== "duplicate",
  );

  if (settled.length === 0) return <p className="text-xs leading-5">{words.nothingLearnedYet}</p>;

  return (
    <TooltipProvider>
      <ul className="space-y-1">
        {settled.map((rule) => {
          const sentence = sentenceOf(rule, folders);

          return (
            <li key={rule.key} className="group flex items-center gap-2 rounded-md px-2 py-1.5">
              <span className="min-w-0 flex-1 text-xs leading-5">
                {lit(sentence, subjectsOf(rule, folders))}
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => onForget(rule)}
                      aria-label={words.forgetAbout(sentence)}
                      className={`rounded-md p-1 text-muted-foreground hover:text-foreground ${quiet}`}
                    />
                  }
                >
                  <Undo2 aria-hidden="true" className="size-3.5" />
                </TooltipTrigger>
                <TooltipPopup side="left">{words.forgetThis}</TooltipPopup>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
};
