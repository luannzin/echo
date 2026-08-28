import { Shot } from "@/components/shot";
import type { Content } from "@/content/en";

/** The screens, in the order the claims are made. Files, not copy, so they stay here. */
const SHOTS = [
  "/shots/search.webp",
  "/shots/inbox.webp",
  "/shots/note.webp",
  "/shots/meaning.webp",
];

/**
 * Four claims, four screens, one grid.
 *
 * Ruled cells rather than four full-width sections, because past the first demonstration a reader is
 * comparing rather than being introduced, and four alternating two-column rows is a grid pretending
 * to be a narrative. The rules are on the cells and the measure is still `.shell`'s, so the leading
 * edge does not move from the section above.
 *
 * Cells start at the top rather than stretching: the shots are the app's own screens at their own
 * proportions, and squaring them off would mean cropping the part that proves the claim.
 */
export const Features = ({ content }: { content: Content }) => (
  <section id="features" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell">
      <div className="reveal max-w-3xl">
        <p className="label text-ink/85">{content.features.label}</p>
        <h2 className="display mt-4 text-[clamp(2rem,3.6vw,3.4rem)]">{content.features.title}</h2>
      </div>

      <div className="mt-12 grid items-start gap-x-14 gap-y-12 border-t rule-ink pt-12 md:mt-16 lg:grid-cols-2">
        {content.features.items.map((feature, index) => (
          <article key={feature.title} className="reveal min-w-0">
            <p className="label text-ink/70">{feature.label}</p>
            <h3 className="display mt-3 text-[clamp(1.5rem,2.2vw,2.05rem)]">{feature.title}</h3>
            <p className="prose-body mt-4 text-ink/85">{feature.body}</p>
            <Shot className="mt-7" src={SHOTS[index] ?? ""} alt={feature.alt} />
          </article>
        ))}
      </div>
    </div>
  </section>
);
