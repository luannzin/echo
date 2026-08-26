import { Engraving } from "@/components/engraving";

const session = [
  { prompt: true, text: "bun run dev" },
  { text: "✓ pglite open · idb://echo" },
  { text: "✓ migrations up to date" },
  { text: "✓ echo ready · http://localhost:3000" },
];

/**
 * The proof shot. A window on a plate, the way the app actually starts: no key, no login, no
 * network — three lines and a local database.
 */
export const TerminalBand = () => (
  <section className="relative overflow-hidden py-16 md:py-24">
    <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10">
      <div className="relative overflow-hidden border rule-ink">
        <Engraving
          plate="wave"
          screen="halftone"
          className="parallax absolute inset-0 size-full blur-[2px]"
        />
        <div className="absolute inset-0 bg-brand-deep/35" />
        <div className="relative grid place-items-center px-4 py-20 md:py-32">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-carbon shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
            <div className="relative flex items-center border-b border-white/10 px-4 py-2.5">
              <div className="flex gap-2">
                {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
                  <span key={dot} className="size-3 rounded-full" style={{ background: dot }} />
                ))}
              </div>
              <span className="label absolute inset-x-0 text-center text-white/45">echo — zsh</span>
            </div>
            <div className="space-y-2 px-5 py-6 font-mono text-[0.82rem] leading-relaxed">
              {session.map((line) => (
                <p key={line.text} className={line.prompt ? "text-white" : "text-white/55"}>
                  {line.prompt ? <span className="text-brand-bright">~ % </span> : null}
                  {line.text}
                </p>
              ))}
              <p className="text-white/55">
                <span className="text-brand-bright">~ % </span>
                <span className="caret">▊</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
