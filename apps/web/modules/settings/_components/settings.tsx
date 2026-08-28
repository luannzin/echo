"use client";

import type { EmbedderStatus } from "@echo/embeddings";
import type { LearnedRule } from "@echo/learning";
import type { Folder, Note } from "@echo/types";
import { Check, Copy, Download, ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Learned } from "@/modules/intelligence/_components/learned";
import { Choices } from "@/modules/settings/_components/choices";
import { Section } from "@/modules/settings/_components/section";
import { notebook } from "@/modules/settings/export";
import { Label } from "@/shared/_components/label";
import {
  currentMotion,
  currentTheme,
  type Motion,
  setMotion,
  setTheme,
  type Theme,
} from "@/shared/lib/appearance";
import { eraseEverything } from "@/shared/lib/erase";
import { copy, LOCALE_SPECS, LOCALES, type Locale } from "@/shared/lib/i18n";
import type { McpEndpoint } from "@/shared/lib/mcp";
import { readChoice, STORAGE, writeChoice } from "@/shared/lib/preferences";
import { saveCopy } from "@/shared/lib/save-copy";
import { type Shortcut, shortcutLabel } from "@/shared/lib/shortcuts";
import { formatExact } from "@/shared/lib/time";

/** The repository, written down once, the same way the marketing site writes it down once. */
const SOURCE = "https://github.com/luannzin/echo";

/** Every shortcut the full app answers, in the order a reader meets them. */
const SHORTCUTS: readonly Shortcut[] = [
  "palette",
  "search",
  "new-note",
  "organize",
  "toggle-notes",
  "toggle-intelligence",
  "undo",
];

/**
 * Where every answer about how echo behaves is given, and the only screen in the app that is about
 * echo rather than about the notes.
 *
 * It is a destination like the Inbox or the timeline rather than a dialog, for two reasons: a dialog
 * over the writing surface is a dialog that has to be dismissed before anything can be checked, and
 * every one of these choices is one a reader wants to *see the effect of* — the language changes
 * under the pointer, and the theme repaints the page they are standing on.
 */
export const Settings = ({
  locale,
  onLocaleChange,
  notes,
  rules,
  folders,
  onForget,
  model,
  modelId,
  version,
  onReplayTour,
  onRestoreChecklist,
  assistants,
  onAssistantsChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  /** Every note there is, for the export. */
  notes: Note[];
  rules: LearnedRule[];
  folders: Folder[];
  onForget: (rule: LearnedRule) => void;
  model: EmbedderStatus;
  /** Which model wrote the vectors, named. */
  modelId: string;
  version: string;
  /** Absent until the tour exists to be replayed. */
  onReplayTour?: () => void;
  onRestoreChecklist?: () => void;
  /** Where an assistant may reach echo, or `null` while nothing may. Absent off the desktop app. */
  assistants?: McpEndpoint | null;
  onAssistantsChange?: (on: boolean) => Promise<void>;
}) => {
  const words = copy().settings;
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const [motion, setMotionState] = useState<Motion>(currentMotion);
  const [storage, setStorage] = useState(() => readChoice(STORAGE));
  /** What the last press did, said where it was pressed rather than in a corner of the window. */
  const [notice, setNotice] = useState<string | null>(null);
  /** The reset, revealed only once it has been asked for, and armed only once it has been typed. */
  const [erasing, setErasing] = useState(false);
  const [typed, setTyped] = useState("");

  const chooseTheme = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

  const chooseMotion = (next: Motion) => {
    setMotion(next);
    setMotionState(next);
  };

  const chooseStorage = (next: "local" | "synced") => {
    writeChoice(STORAGE, next);
    setStorage(next);
  };

  /** Which of the two facts was last copied, so the button can say so where it was pressed. */
  const [copied, setCopied] = useState<"url" | "token" | null>(null);
  const [assistantsFailed, setAssistantsFailed] = useState(false);

  const chooseAssistants = async (on: boolean) => {
    if (!onAssistantsChange) return;
    setAssistantsFailed(false);
    try {
      await onAssistantsChange(on);
    } catch {
      setAssistantsFailed(true);
    }
  };

  const copyOut = async (what: "url" | "token", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(what);
  };

  const exportAll = async () => {
    if (notes.length === 0) return setNotice(words.exportEmpty);
    try {
      const written = await saveCopy("echo", notebook(notes, formatExact));
      if (written) setNotice(words.exported);
    } catch {
      setNotice(words.exportFailed);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="pb-1">
        <h1 className="font-display text-3xl tracking-tight">{words.title}</h1>
      </div>
      <p className="pb-2 text-muted-foreground text-sm leading-relaxed">{words.subtitle}</p>

      <Section title={words.language} note={words.languageNote}>
        <Choices
          legend={words.language}
          value={locale}
          onChange={onLocaleChange}
          options={LOCALES.map((tag) => ({ value: tag, label: LOCALE_SPECS[tag].region }))}
        />
      </Section>

      <Section title={words.storage}>
        <Choices
          legend={words.storage}
          value={storage}
          onChange={chooseStorage}
          options={[
            { value: "local", label: words.storageLocal, note: words.storageLocalNote },
            {
              value: "synced",
              label: words.storageSynced,
              note: words.storageSyncedNote,
              unavailable: true,
            },
          ]}
        />
      </Section>

      <Section title={words.appearance}>
        <Choices
          legend={words.appearance}
          value={theme}
          onChange={chooseTheme}
          options={[
            { value: "dark", label: words.themeDark },
            { value: "light", label: words.themeLight },
            { value: "system", label: words.themeSystem },
          ]}
        />
      </Section>

      <Section title={words.motion}>
        <Choices
          legend={words.motion}
          value={motion}
          onChange={chooseMotion}
          options={[
            { value: "system", label: words.motionSystem, note: words.motionSystemNote },
            { value: "reduced", label: words.motionReduced, note: words.motionReducedNote },
          ]}
        />
      </Section>

      <Section title={words.learned}>
        <div className="text-muted-foreground">
          <Learned rules={rules} folders={folders} onForget={onForget} />
        </div>
      </Section>

      {onReplayTour || onRestoreChecklist ? (
        <Section title={words.gettingStarted}>
          <div className="flex flex-col gap-2">
            {onReplayTour ? (
              <Row label={words.replayTour} note={words.replayTourNote}>
                <Button size="sm" variant="secondary" onClick={onReplayTour} className="gap-2">
                  <RotateCcw aria-hidden="true" />
                  {words.replayTour}
                </Button>
              </Row>
            ) : null}
            {onRestoreChecklist ? (
              <Row label={words.restoreChecklist} note={words.restoreChecklistNote}>
                <Button size="sm" variant="ghost" onClick={onRestoreChecklist}>
                  {words.restoreChecklist}
                </Button>
              </Row>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section title={words.yourNotes}>
        <div className="flex flex-col gap-2">
          <Row label={words.exportAll} note={words.exportAllNote}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void exportAll()}
              className="gap-2"
            >
              <Download aria-hidden="true" />
              {words.exportAll}
            </Button>
          </Row>

          {/* The one irreversible thing in the app, and the only place it is offered. It reveals in
              two steps: asking for it opens the field, and the field has to say the word. */}
          <Row label={words.reset} note={words.resetNote}>
            {erasing ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={(element) => element?.focus()}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setErasing(false);
                      setTyped("");
                    }
                  }}
                  aria-label={words.resetPrompt(words.resetWord)}
                  placeholder={words.resetWord}
                  className="w-32 rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={typed.trim().toLowerCase() !== words.resetWord}
                  onClick={() => void eraseEverything()}
                  className="gap-2"
                >
                  <Trash2 aria-hidden="true" />
                  {words.reset}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setErasing(false);
                    setTyped("");
                  }}
                >
                  {copy().common.cancel}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setErasing(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
                {words.reset}
              </Button>
            )}
          </Row>

          {notice ? (
            <p key={notice} aria-live="polite" className="animate-settle">
              <Label>{notice}</Label>
            </p>
          ) : null}
        </div>
      </Section>

      {onAssistantsChange ? (
        <Section title={words.assistants} note={words.assistantsNote}>
          <div className="flex flex-col gap-2">
            <Row
              label={assistants ? words.assistantsOn : words.assistantsOff}
              note={assistantsFailed ? words.assistantsFailed : words.assistantsCare}
            >
              <Button
                size="sm"
                variant={assistants ? "ghost" : "secondary"}
                onClick={() => void chooseAssistants(!assistants)}
              >
                {assistants ? words.assistantsStop : words.assistantsStart}
              </Button>
            </Row>

            {/* The address and the token, each one press from the clipboard. The token is never
                printed: a settings screen is a thing people show other people. */}
            {assistants ? (
              <>
                <Row label={words.assistantsAddress} note={assistants.url}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void copyOut("url", assistants.url)}
                    className="gap-2"
                  >
                    {copied === "url" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {copied === "url" ? words.assistantsCopied : words.assistantsCopy}
                  </Button>
                </Row>
                <Row label={words.assistantsToken} note={words.assistantsTokenHidden}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void copyOut("token", assistants.token)}
                    className="gap-2"
                  >
                    {copied === "token" ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    {copied === "token" ? words.assistantsCopied : words.assistantsCopy}
                  </Button>
                </Row>
              </>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section title={words.keyboard}>
        <ul className="flex flex-col">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut}
              className="flex items-center justify-between gap-4 border-border/60 border-t py-1.5 text-sm first:border-t-0"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {words.shortcuts[shortcut]}
              </span>
              <Kbd className="shrink-0">{shortcutLabel(shortcut)}</Kbd>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={words.about} note={words.noAccount}>
        <dl className="flex flex-col text-sm">
          <Fact term={words.version} value={version} />
          <Fact
            term={words.model}
            value={model.state === "ready" ? modelId : `${modelId} · ${words.modelNone}`}
          />
        </dl>
        <a
          href={SOURCE}
          target="_blank"
          rel="noreferrer noopener"
          className="-mx-1 mt-3 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-muted-foreground text-sm outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {words.source}
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </Section>
    </div>
  );
};

/** A setting and the control that answers it, stacked on a phone and side by side above it. */
const Row = ({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm">{label}</span>
      <span className="text-muted-foreground text-xs leading-5">{note}</span>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/** One thing that is true about this build. */
const Fact = ({ term, value }: { term: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-border/60 border-t py-1.5 first:border-t-0">
    <dt className="text-muted-foreground">{term}</dt>
    <dd className="min-w-0 truncate font-mono text-xs tabular-nums">{value}</dd>
  </div>
);
