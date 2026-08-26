"use client";

import { useState } from "react";

const targets = [
  {
    id: "web",
    label: "Web",
    lines: [
      "git clone https://github.com/luannzin/echo.git",
      "cd echo && bun install",
      "bun run dev",
    ],
  },
  {
    id: "desktop",
    label: "Desktop",
    lines: ["cd echo && bun install", "bun run dev:desktop"],
  },
] as const;

/**
 * Copy is offered, never assumed: the clipboard write can be refused by the browser, so the command
 * stays selectable text and the button only reports what actually happened.
 */
export const InstallBox = () => {
  const [target, setTarget] = useState<(typeof targets)[number]["id"]>("web");
  const [copied, setCopied] = useState(false);
  const active = targets.find((entry) => entry.id === target) ?? targets[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-xl border rule-ink bg-ink text-brand">
      <div className="flex items-center justify-between border-b rule-brand px-4 py-2.5">
        <div className="flex items-center gap-5">
          {targets.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTarget(entry.id)}
              className={`label transition-opacity ${entry.id === target ? "opacity-100" : "opacity-45 hover:opacity-75"}`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy the ${active.label} commands`}
          className="label border rule-brand px-2 py-1 transition-colors hover:bg-brand hover:text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="space-y-1.5 px-4 py-4 font-mono text-[0.78rem] leading-relaxed text-brand-deep">
        {active.lines.map((line) => (
          <p key={line} className="overflow-x-auto whitespace-pre">
            <span className="opacity-45">$ </span>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};
