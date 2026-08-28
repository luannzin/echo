import { Engraving } from "@/components/engraving";
import { InstallBox } from "@/components/install-box";
import type { Content } from "@/content/en";

export const RunIt = ({ content }: { content: Content }) => (
  <section id="install" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div className="reveal min-w-0">
        <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)]">{content.runIt.title}</h2>
        <p className="prose-body mt-5 text-ink/85">{content.runIt.body}</p>

        <dl className="mt-8 border-t rule-ink">
          {content.runIt.requirements.map(([term, detail]) => (
            <div key={term} className="border-b rule-ink py-4">
              <dt className="label text-ink">{term}</dt>
              <dd className="prose-body mt-1.5 text-ink/85">{detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <InstallBox words={content.runIt.install} />
        </div>
      </div>

      {/*
       * The plate, not a picture of a terminal. The commands are already on the left, in a box that
       * copies them; drawing them a second time as a window that types itself was the same three
       * lines twice. This is ground: an engraved orb on the field, screened through the same dither
       * every other plate on the page is printed with, and drifting on its own travel through the
       * viewport.
       */}
      <div className="relative min-w-0">
        <Engraving
          plate="orb"
          className="parallax ms-auto aspect-square w-full max-w-[34rem] opacity-30 [mask-image:radial-gradient(closest-side,black_58%,transparent)]"
          style={{ "--parallax": "5%", "--parallax-scale": "1.06" } as React.CSSProperties}
        />
      </div>
    </div>
  </section>
);
