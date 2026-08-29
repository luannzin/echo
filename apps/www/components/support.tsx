import { Cta } from "@/components/cta";
import { Engraving } from "@/components/engraving";
import { COFFEE } from "@/components/links";
import type { Content } from "@/content/en";

/**
 * The ask, made once and made honestly.
 *
 * It is placed after the reader has seen the product work and been told how to run it, and before
 * the closing line. Not in a banner at the top, and not in a bar that follows them down the page.
 * Someone who has not yet decided the thing is any good has nothing to thank anybody for.
 *
 * What makes it answerable rather than decorative is that the copy names the exchange: there is no
 * paid tier and no account to upgrade, so this is the only way to give anything back, and the ask
 * is one coffee rather than an open-ended appeal. The plate is the site's own engraving system
 * rather than a downloaded coffee glyph, so it is drawn at the resolution it is displayed at and
 * takes its two colours from the theme like every other plate on the page.
 */
export const Support = ({ content }: { content: Content }) => (
  <section id="support" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
      <div className="reveal min-w-0">
        <p className="label text-ink/70">{content.support.label}</p>
        <h2 className="display mt-4 text-[clamp(2rem,3.6vw,3.4rem)]">{content.support.title}</h2>
        <p className="prose-body mt-5 text-ink/85">{content.support.body}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Cta href={COFFEE} tone="solid">
            {content.support.cta}
          </Cta>
          <p className="label text-ink/60">{content.support.note}</p>
        </div>
      </div>

      {/*
       * Out of the flow of the copy and masked at its edges, like the orb beside the commands: the
       * plate is ground, and the sentence is the thing being read.
       */}
      <div className="relative min-w-0">
        <Engraving
          plate="cup"
          className="parallax ms-auto aspect-square w-full max-w-[26rem] opacity-30 [mask-image:radial-gradient(closest-side,black_62%,transparent)]"
          style={{ "--parallax": "5%", "--parallax-scale": "1.05" } as React.CSSProperties}
        />
      </div>
    </div>
  </section>
);
