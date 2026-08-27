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
    after: "Open http://localhost:3000. There is no .env to fill in and no account to create.",
  },
  {
    id: "desktop",
    label: "Desktop",
    lines: ["cd echo && bun install", "bun run dev:desktop"],
    after: "Needs a Rust toolchain. On Linux, also webkit2gtk-4.1, gtk+-3.0 and libsoup-3.0.",
  },
] as const;

type Status = "idle" | "copied" | "failed";

/**
 * Copy is offered, never assumed: the clipboard write can be refused by the browser, so the commands
 * stay selectable text and the button reports what actually happened, including the refusal, which
 * used to leave the reader pressing a button that did nothing and said nothing.
 */
export const InstallBox = () => {
  const [target, setTarget] = useState<(typeof targets)[number]["id"]>("web");
  const [status, setStatus] = useState<Status>("idle");
  const active = targets.find((entry) => entry.id === target) ?? targets[0];

  const select = (id: (typeof targets)[number]["id"]) => {
    setTarget(id);
    setStatus("idle");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.lines.join("\n"));
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
            {targets.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => select(entry.id)}
                aria-pressed={entry.id === target}
                className={`press label transition-colors ${
                  entry.id === target ? "text-ink" : "text-faint hover:text-quiet"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy the ${active.label} commands`}
            className="press label border rule-carbon px-2.5 py-1 text-faint transition-colors hover:bg-quiet/10 hover:text-ink"
          >
            {status === "copied" ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="space-y-1.5 px-4 py-4 font-mono text-[0.78rem] leading-relaxed">
          {active.lines.map((line) => (
            <p key={line} className="overflow-x-auto whitespace-pre">
              <span className="text-brand-lit">$ </span>
              {line}
            </p>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="prose-body mt-3 text-ink/85">
        {status === "failed"
          ? "Your browser wouldn’t let the page use the clipboard. Select the lines above and copy them."
          : active.after}
      </p>
    </div>
  );
};
