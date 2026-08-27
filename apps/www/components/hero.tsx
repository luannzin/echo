import { Engraving } from "@/components/engraving";
import { REPO } from "@/components/links";

const beat = (ms: number) => ({ "--beat": `${ms}ms` }) as React.CSSProperties;

export const Hero = () => (
  <section id="top" className="relative overflow-hidden">
    {/* The plate is the hero's only image now, so it is allowed to be large and to run off the edge. */}
    <Engraving
      plate="burst"
      className="pointer-events-none absolute -top-1/4 -right-1/3 hidden size-[82vw] opacity-25 md:block"
    />

    <div className="shell relative py-16 md:min-h-[70vh] md:content-center md:py-24">
      {/*
       * The measure is the headline's, not the container's. Without the demo beside it the copy had
       * the whole shell to spread across, and a 92px display line running 900px wide stops reading
       * as a headline and starts reading as a paragraph set in the wrong face.
       */}
      <div className="min-w-0 max-w-3xl">
        <p className="beat label text-ink/85" style={beat(0)}>
          No AI · Open source · Runs on your machine · No account
        </p>

        <h1 className="beat display mt-5 text-[clamp(2.9rem,6.6vw,5.5rem)]" style={beat(90)}>
          The note taker that learns with you
        </h1>

        <p className="beat prose-lede mt-7 text-ink/85" style={beat(190)}>
          You write one line and press Enter. echo reads what you wrote: the deadline you mentioned
          in passing, the task hiding in it, the words you keep using. It gets better at handing all
          of it back, and it never leaves your machine.
        </p>

        <div className="beat mt-9 flex flex-wrap items-center gap-3" style={beat(290)}>
          <a
            href="#write"
            className="press label border rule-ink bg-ink px-5 py-3 text-brand transition-colors hover:bg-brand-deep hover:text-ink"
          >
            See it working ↓
          </a>
          <a
            href="#install"
            className="press label border rule-ink px-5 py-3 text-ink/85 transition-colors hover:bg-ink/10 hover:text-ink"
          >
            Run it locally
          </a>
          <a
            href={REPO}
            className="press label px-2 py-3 text-ink/85 underline decoration-ink/30 underline-offset-4 transition-colors hover:text-ink"
          >
            Read the source on GitHub
          </a>
        </div>
      </div>
    </div>
  </section>
);
