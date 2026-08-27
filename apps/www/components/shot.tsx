/**
 * A screen of the running application.
 *
 * The plates on this page are drawn and the field is painted, but the screens are photographs: the
 * Inbox arguing for a folder and a palette that has already run the meaning pass are worth more as
 * the thing itself than as a drawing of it, and a drawing is where a claim quietly stops being
 * true. Every one was taken from `apps/web` against a real corpus — `AGENTS.md` has the rules the
 * capture has to hold to.
 *
 * The geometry is written down once, here, rather than passed in per shot. Every file in
 * `public/shots` is cropped to the same 2290x1760, so a caller repeating those numbers is a caller
 * that can get them wrong — and it did: six shots claimed 2880x1760 and two claimed a 1264 crop that
 * no file has, which meant the browser reserved a box a quarter too short and the page jumped under
 * the reader on every image. One constant cannot drift out of step with the files the way eight
 * copies of it can. `.shot > img` carries the same ratio in CSS, so the space is held whichever of
 * the two the browser reads first.
 */
const SHOT_WIDTH = 2290;
const SHOT_HEIGHT = 1760;

export const Shot = ({
  src,
  alt,
  framed = true,
  className,
}: {
  src: string;
  alt: string;
  /**
   * Off where the shot is tilted off the edge of its column rather than sat squarely in it: a
   * border and a shadow describe a rectangle, and there is no rectangle left once the image has
   * been turned and faded out at two of its edges.
   */
  framed?: boolean;
  className?: string;
}) => (
  <figure className={`shot ${framed ? "panel" : ""} ${className ?? ""}`}>
    <img
      src={src}
      alt={alt}
      width={SHOT_WIDTH}
      height={SHOT_HEIGHT}
      loading="lazy"
      decoding="async"
    />
  </figure>
);
