/**
 * The session, typing itself.
 *
 * Three commands and what they answer, scrubbed against the window's own travel through the
 * viewport, so it types as it is scrolled to, holds when it is read, and rewinds if the reader
 * goes back up. No listener, no observer, no library: each line takes its own slice of one
 * view() timeline. Every line holds its whole text in the markup and is revealed by clipping, so a
 * browser without scroll-driven animation shows the finished session rather than an empty window.
 */

type Line =
  | { kind: "cmd"; text: string; keys: number; from: number; to: number }
  | { kind: "out"; text: string; from: number; to: number };

const session: Line[] = [
  {
    kind: "cmd",
    text: "git clone https://github.com/luannzin/echo.git",
    keys: 46,
    from: 4,
    to: 22,
  },
  { kind: "cmd", text: "cd echo && bun install", keys: 22, from: 25, to: 34 },
  { kind: "cmd", text: "bun run dev", keys: 11, from: 37, to: 44 },
  { kind: "out", text: "✓ pglite open · idb://echo", from: 46, to: 52 },
  { kind: "out", text: "✓ migrations up to date", from: 51, to: 57 },
  { kind: "out", text: "✓ echo ready · http://localhost:3000", from: 56, to: 63 },
];

const cue = (from: number, to: number) =>
  ({ "--cue-from": `${from}%`, "--cue-to": `${to}%` }) as React.CSSProperties;

const DOTS = ["#ff5f57", "#febc2e", "#28c840"];

export const TerminalDemo = () => (
  <div className="relative">
    {/* The window lights the field behind it as the session lands. */}
    <div
      aria-hidden="true"
      className="cue pointer-events-none absolute -inset-x-10 -inset-y-8 z-0 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,var(--color-brand-bright),transparent_70%)] opacity-40 blur-2xl"
      style={cue(20, 64)}
    />

    <div className="panel relative z-10">
      <div className="relative flex items-center border-b rule-carbon bg-carbon-lift px-4 py-2.5">
        <div className="flex gap-2">
          {DOTS.map((dot) => (
            <span key={dot} className="size-3 rounded-full" style={{ background: dot }} />
          ))}
        </div>
        <span className="label absolute inset-x-0 text-center text-faint">echo · zsh</span>
      </div>

      <div className="space-y-1.5 overflow-x-auto px-5 py-6 font-mono text-[0.78rem] leading-relaxed md:text-[0.82rem]">
        {session.map((entry) =>
          entry.kind === "cmd" ? (
            <p key={entry.text} className="whitespace-pre text-quiet">
              <span className="cue text-brand-lit" style={cue(entry.from, entry.from + 2)}>
                ~ %{" "}
              </span>
              <span
                className="cue-keys inline-block align-bottom"
                style={
                  { ...cue(entry.from, entry.to), "--keys": entry.keys } as React.CSSProperties
                }
              >
                {entry.text}
              </span>
            </p>
          ) : (
            <p
              key={entry.text}
              className="cue whitespace-pre pl-4 text-faint"
              style={cue(entry.from, entry.to)}
            >
              {entry.text}
            </p>
          ),
        )}
        <p className="cue whitespace-pre text-quiet" style={cue(64, 69)}>
          <span className="text-brand-lit">~ % </span>
          <span className="caret">▊</span>
        </p>
      </div>
    </div>
  </div>
);
