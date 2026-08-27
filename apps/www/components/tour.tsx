import { Shot } from "@/components/shot";

const points = [
  {
    title: "The stream",
    subtitle:
      "Everything you have written, in the order you wrote it, with the box still on screen.",
    shot: {
      src: "/shots/stream.webp",
      width: 2880,
      height: 1760,
      alt: "The stream: notes stamped with when they were written and last edited, running down the screen, with the composer docked at the foot of it.",
    },
  },
  {
    title: "Tasks",
    subtitle:
      "The things to do that were hiding in ordinary sentences, with the dates those sentences mentioned.",
    shot: {
      src: "/shots/tasks.webp",
      width: 2880,
      height: 1760,
      alt: "The task list: five open tasks, the ones with a date grouped under Due and the rest under No date, each showing the note it came out of.",
    },
  },
  {
    title: "Timeline",
    subtitle:
      "What you were working on, by day and by week, with what is coming pulled to the top.",
    shot: {
      src: "/shots/timeline.webp",
      width: 2880,
      height: 1760,
      alt: "The timeline: a This week band holding the deadlines echo found, and under it the days, each with the words that ran through them and the notes written that day.",
    },
  },
  {
    title: "Writing",
    subtitle:
      "The composer, the words echo read out of the sentence, and the notes it is already reminded of.",
    shot: {
      src: "/shots/write.webp",
      width: 2880,
      height: 1760,
      alt: "A sentence being written in echo. The composer shows a word count and a Due friday chip, and the panel beside it already lists four notes it connects to.",
    },
  },
];

/**
 * The rest of the application, four screens deep, without four more screens of scrolling.
 *
 * Pressing a point swaps what is beside it and nothing else moves, so the four are read as one
 * thing with four faces rather than as four more claims. The state is a radio group and the swap is
 * a `:checked` rule — no JavaScript, no hydration, and the arrow keys, the focus ring and the group
 * name a screen reader announces all come from the control rather than from a re-implementation of
 * it. See `.tour-*` in `app/globals.css`.
 *
 * The first point is checked in the markup, so a reader whose CSS never arrives gets a stack of four
 * captioned screenshots instead of an empty stage.
 */
export const Tour = () => (
  <section id="tour" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell">
      <div className="reveal max-w-3xl">
        <p className="label text-ink/85">The rest of it</p>
        <h2 className="display mt-4 text-[clamp(2rem,3.6vw,3.4rem)]">
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

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="min-w-0">
            {points.map((point, index) => (
              <label
                key={point.title}
                htmlFor={`tour-${index + 1}`}
                data-tour={String(index + 1)}
                className="tour-point block cursor-pointer py-5 ps-5"
              >
                <span className="display block text-[clamp(1.35rem,1.9vw,1.75rem)]">
                  {point.title}
                </span>
                <span className="prose-body mt-2 block text-ink/80">{point.subtitle}</span>
              </label>
            ))}
          </div>

          <div className="grid min-w-0">
            {points.map((point, index) => (
              <div key={point.title} data-tour={String(index + 1)} className="tour-panel min-w-0">
                <Shot
                  {...point.shot}
                  framed={false}
                  className="relative origin-top-right overflow-hidden rounded-xl rotate-[5deg] scale-75 skew-x-[-10deg] sm:scale-90"
                />
              </div>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  </section>
);
