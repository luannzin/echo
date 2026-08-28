"use client";

import { useState } from "react";
import type { Content } from "@/content/en";

/**
 * The commands, which are not copy: they are typed into a shell, and a translated `bun install` is
 * a translated command that does not run. Only what is said *about* them moves with the language.
 */
const COMMANDS = {
  web: ["git clone https://github.com/luannzin/echo.git", "cd echo && bun install", "bun run dev"],
  desktop: ["cd echo && bun install", "bun run dev:desktop"],
} as const;

type Target = keyof typeof COMMANDS;

type Status = "idle" | "copied" | "failed";

/**
 * Copy is offered, never assumed: the clipboard write can be refused by the browser, so the commands
 * stay selectable text and the button reports what actually happened, including the refusal, which
 * used to leave the reader pressing a button that did nothing and said nothing.
 */
export const InstallBox = ({ words }: { words: Content["runIt"]["install"] }) => {
  const [target, setTarget] = useState<Target>("web");
  const [status, setStatus] = useState<Status>("idle");
  const lines = COMMANDS[target];

  const select = (id: Target) => {
    setTarget(id);
    setStatus("idle");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="border rule-ink bg-carbon text-quiet">
        <div className="flex items-center justify-between border-b rule-carbon bg-carbon-lift px-4 py-2.5">
          <div className="flex items-center gap-5">
            {(["web", "desktop"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                aria-pressed={id === target}
                className={`press label transition-colors ${
                  id === target ? "text-ink" : "text-faint hover:text-quiet"
                }`}
              >
                {id === "web" ? words.web : words.desktop}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copy}
            aria-label={target === "web" ? words.copyWebLabel : words.copyDesktopLabel}
            className="press label border rule-carbon px-2.5 py-1 text-faint transition-colors hover:bg-quiet/10 hover:text-ink"
          >
            {status === "copied" ? words.copied : words.copy}
          </button>
        </div>

        <div className="space-y-1.5 px-4 py-4 font-mono text-[0.78rem] leading-relaxed">
          {lines.map((line) => (
            <p key={line} className="overflow-x-auto whitespace-pre">
              <span className="text-brand-lit">$ </span>
              {line}
            </p>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="prose-body mt-3 text-ink/85">
        {status === "failed"
          ? words.failed
          : target === "web"
            ? words.webAfter
            : words.desktopAfter}
      </p>
    </div>
  );
};
