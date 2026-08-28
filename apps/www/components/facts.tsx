import { Engraving } from "@/components/engraving";
import type { Content } from "@/content/en";

/**
 * The band where the field goes quiet.
 *
 * One tonal shift late in the page, carrying the four things a reader who has decided they are
 * interested actually wants to know. The paper bleeds the full width of the viewport and the text
 * inside it sits on the same `.shell` as every other section, so the tone changes without the
 * alignment moving. Ruled rows rather than cards: these are facts in a column, not six products to
 * choose between.
 */
export const Facts = ({ content }: { content: Content }) => (
  <section
    id="facts"
    className="relative scroll-mt-24 overflow-hidden bg-paper py-16 text-brand md:py-24"
  >
    <Engraving
      plate="spiral"
      screen="dither-paper"
      className="parallax pointer-events-none absolute -top-24 -right-24 size-[34rem] opacity-[0.18]"
      style={{ "--parallax": "6%" } as React.CSSProperties}
    />

    <div className="shell relative">
      <div className="reveal grid gap-6 border-b rule-brand pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-14">
        <h2 className="display text-[clamp(2.1rem,4vw,3.6rem)] text-brand">
          {content.facts.lead.title}
        </h2>
        <div>
          <p className="prose-body text-brand/80">{content.facts.lead.body}</p>
          <p className="label mt-4 text-brand/70">{content.facts.lead.stat}</p>
        </div>
      </div>

      <div className="grid gap-x-12 gap-y-10 pt-12 lg:grid-cols-3">
        {content.facts.rest.map((fact) => (
          <div key={fact.title} className="reveal border-t rule-brand pt-6">
            <h3 className="font-sans text-[1.0625rem] font-medium tracking-[-0.01em] text-brand">
              {fact.title}
            </h3>
            <p className="prose-body mt-2.5 text-brand/75">{fact.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
