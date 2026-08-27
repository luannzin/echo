import { Shot } from "@/components/shot";

const points = [
  {
    title: "The stream",
    subtitle:
      "Everything lands here first, in the order you wrote it, and the box you write in never leaves the screen.",
    shot: {
      src: "/shots/stream.webp",
      alt: "The stream: notes stamped with when they were written and last edited, running down the screen, with the composer docked at the foot of it.",
    },
  },
  {
    title: "Tasks",
    subtitle:
      "echo lifts the things to do out of ordinary sentences, and brings the dates those sentences mentioned with them.",
    shot: {
      src: "/shots/tasks.webp",
      alt: "The task list: five open tasks, the ones with a date grouped under Due and the rest under No date, each showing the note it came out of.",
    },
  },
  {
    title: "Timeline",
    subtitle:
      "The same notes read back by day and by week, with whatever is coming up pulled to the top.",
    shot: {
      src: "/shots/timeline.webp",
      alt: "The timeline: a This week band holding the deadlines echo found, and under it the days, each with the words that ran through them and the notes written that day.",
    },
  },
  {
    title: "Writing",
    subtitle:
      "Write a line and watch it get read: the words echo took out of the sentence, and the notes it is already reminded of.",
    shot: {
      src: "/shots/write.webp",
      alt: "A sentence being written in echo. The composer shows a word count and a Due friday chip, and the panel beside it already lists four notes it connects to.",
    },
  },
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
export const Tour = () => (
  <section id="tour" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell">
      <div className="reveal max-w-3xl">
        <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)]">
          Everything you write, kept four ways
        </h2>
        <p className="prose-body mt-5 text-ink/85">
          One pile of notes, read back as a stream, a task list, a timeline and a page you are
          writing on. Nothing here is a separate place to keep things up to date.
        </p>
      </div>

      <fieldset className="mt-12 min-w-0 md:mt-16">
        <legend className="sr-only">Choose a screen</legend>

        {points.map((point, index) => (
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
          {points.map((point, index) => (
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
                <Shot {...point.shot} className="tour-shot" />
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  </section>
);
