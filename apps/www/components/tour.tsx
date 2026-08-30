import { Shot } from "@/components/shot";
import type { Content } from "@/content/en";

/** The screens, in the order the points are made. Files, not copy. */
const SHOTS = [
  "/shots/stream.webp",
  "/shots/tasks.webp",
  "/shots/native.webp",
  "/shots/write.webp",
];

/**
 * The rest of the application, four screens deep, without four more screens of scrolling.
 *
 * The state is a radio group and the swap is a `:checked` rule — no JavaScript, no hydration, and
 * the arrow keys, the focus ring and the group name a screen reader announces all come from the
 * control rather than from a re-implementation of it. The first point is checked in the markup, so a
 * reader whose CSS never arrives gets a stack of four captioned screenshots instead of an empty
 * stage. See `.tour-*` in `app/globals.css`.
 *
 * Each point is married to its own screen in the markup, inside a `.tour-row`, and the two layouts
 * are the same four pairs read two ways. Narrow, a row is a row: the screen opens directly under the
 * point that names it, so the thing that changed is under the thumb that changed it. Wide, the row
 * goes `display: contents` and the pair splits across a two-column grid — points down the leading
 * column, every screen sharing one cell in the trailing one. Before this the stage was a third
 * column that only existed above `lg`; under it, the screen sat below all four points, a full
 * viewport from the one that selected it, and pressing a point moved something off screen.
 */
export const Tour = ({ content }: { content: Content }) => (
  <section id="tour" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell">
      <div className="reveal max-w-3xl">
        <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)]">{content.tour.title}</h2>
        <p className="prose-body mt-5 text-ink/85">{content.tour.lede}</p>
      </div>

      <fieldset className="mt-12 min-w-0 md:mt-16">
        <legend className="sr-only">{content.tour.legend}</legend>

        {content.tour.points.map((point, index) => (
          <input
            key={point.title}
            type="radio"
            name="tour"
            id={`tour-${index + 1}`}
            data-tour={String(index + 1)}
            defaultChecked={index === 0}
            className="tour-pick"
          />
        ))}

        <div className="tour-grid">
          {content.tour.points.map((point, index) => (
            <div
              key={point.title}
              className="tour-row min-w-0"
              style={{ "--reveal-step": index } as React.CSSProperties}
            >
              <label
                htmlFor={`tour-${index + 1}`}
                data-tour={String(index + 1)}
                className="tour-point press reveal block min-w-0 cursor-pointer"
              >
                <span className="tour-title display block text-[clamp(1.35rem,1.9vw,1.75rem)]">
                  {point.title}
                </span>
                <span className="prose-body mt-2 block text-ink/80">{point.subtitle}</span>
              </label>

              <div data-tour={String(index + 1)} className="tour-panel min-w-0">
                <Shot src={SHOTS[index] ?? ""} alt={point.alt} className="tour-shot" />
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  </section>
);
