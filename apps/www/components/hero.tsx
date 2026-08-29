import { Cta } from "@/components/cta";
import { Engraving } from "@/components/engraving";
import { REPO } from "@/components/links";
import { WordReveal } from "@/components/word-reveal";
import type { Content } from "@/content/en";

const beat = (ms: number) => ({ "--beat": `${ms}ms` }) as React.CSSProperties;

/**
 * The hero's clock, in one place.
 *
 * The headline is not one beat but one per word, and the lines under it wait for the last of them
 * rather than for the first: at the old 190ms the lede arrived while the headline was still
 * assembling, which read as two things interrupting each other.
 *
 * The clock is set by the longer of the two titles, not by English. "The note taker that learns with
 * you" is seven words; "O bloco de notas que aprende com você" is eight, and a timing that only
 * clears the English one leaves the Portuguese lede landing on top of its own headline. Eight words
 * means the last one leaves at 90 + 7 × 55 = 475ms, so nothing below is placed before 540ms.
 */
const TITLE = { delay: 90, stagger: 55 } as const;

export const Hero = ({ content }: { content: Content }) => (
  <section id="top" className="relative overflow-hidden">
    {/*
     * The phone keeps room under the copy for the plate to occupy. The plate is out of the flow at
     * every width, so that room has to be real padding rather than the height of the picture.
     */}
    <div className="shell relative z-10 pt-16 pb-44 md:min-h-[70vh] md:content-center md:py-24">
      {/*
       * The measure is the headline's, not the container's. Without the demo beside it the copy had
       * the whole shell to spread across, and a 92px display line running 900px wide stops reading
       * as a headline and starts reading as a paragraph set in the wrong face.
       */}
      <div className="min-w-0 max-w-3xl">
        <p className="beat label text-ink/85" style={beat(0)}>
          {content.hero.eyebrow}
        </p>

        <h1 className="display mt-5 text-[clamp(2.9rem,6.6vw,5.5rem)]">
          <WordReveal text={content.hero.title} delay={TITLE.delay} stagger={TITLE.stagger} />
        </h1>

        <p className="beat prose-lede mt-7 text-ink/85" style={beat(540)}>
          {content.hero.lede}
        </p>

        <div className="beat mt-9 flex flex-wrap items-center gap-3" style={beat(660)}>
          <Cta href="#reel" tone="solid">
            {content.hero.watch}
          </Cta>
          <Cta href="#install" tone="outline">
            {content.hero.run}
          </Cta>
          <Cta href={REPO} tone="quiet">
            {content.hero.source}
          </Cta>
        </div>
      </div>
    </div>

    {/*
     * One plate, two jobs, and always out of the flow so it can never push the copy down.
     *
     * On a phone it is anchored to the foot of the hero and masked so it fades in from nothing under
     * the subtitle, which is what makes it read as light coming up from the bottom of the section
     * rather than as a picture somebody dropped in. From `md` it moves to the top right and goes
     * back to being the large plate behind the type. The shell carries `z-10` at both sizes, so the
     * plate stays behind the words despite coming after them in the markup.
     */}
    <Engraving
      plate="burst"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[34vh] w-full opacity-[0.13] [mask-image:linear-gradient(to_bottom,transparent,black_55%,black_88%,transparent)] md:inset-x-auto md:-top-1/4 md:-right-1/3 md:bottom-auto md:h-[82vw] md:w-[82vw] md:opacity-25 md:[mask-image:none]"
    />
  </section>
);
