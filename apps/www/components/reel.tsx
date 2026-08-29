import { ReelPlayer } from "@/components/reel-player";
import type { Content } from "@/content/en";

const SOURCES = [
  { src: "/reel/echo.webm", type: "video/webm" },
  { src: "/reel/echo.mp4", type: "video/mp4" },
];

/**
 * The whole product, once, and nothing said about it.
 *
 * The recording is `apps/web` being written in, searched and triaged, so anything written around it
 * would be describing what is already on screen. It carries no heading for the same reason the hero
 * above it does not repeat itself.
 *
 * This is the one place on the site where the field is not blue: a recording of a dark application
 * needs something behind it that is not the colour of the application. The colour comes up off the
 * floor of the section and dissolves back into the field before the top of it, so the page gains a
 * light source rather than a second background — and it is a layer of its own, out of the flow, so
 * the section's rhythm stays the page's.
 *
 * The recording meets it halfway: it is opaque through the half a reader is reading and runs out
 * into the colour below that, so the two are one light rather than a plate lying on a background.
 * See `.reel-frame` and `.reel-video` in `app/globals.css`.
 */
export const Reel = ({ content }: { content: Content }) => (
  <section id="reel" className="relative scroll-mt-24 overflow-hidden py-20 md:py-32">
    <div
      aria-hidden="true"
      className="spectrum pointer-events-none absolute inset-x-[-16%] top-[8%] bottom-0 z-0"
    />

    <div className="shell relative z-10">
      <ReelPlayer
        poster="/reel/echo-poster.jpg"
        sources={SOURCES}
        label={content.reel.label}
        play={content.reel.play}
        pause={content.reel.pause}
        demo={content.reel.demo}
        close={content.reel.close}
      />
    </div>
  </section>
);
