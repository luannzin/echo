/**
 * A screen of the running application.
 *
 * The plates on this page are drawn and the field is painted, but the screens are photographs: the
 * Inbox arguing for a folder and a palette that has already run the meaning pass are worth more as
 * the thing itself than as a drawing of it, and a drawing is where a claim quietly stops being
 * true. Every one was taken from `apps/web` against a real corpus — `AGENTS.md` has the rules the
 * capture has to hold to.
 *
 * `width` and `height` are the file's own pixels, so the browser holds the space before the image
 * lands and the page does not jump under the reader. All eight are cropped to one geometry, so a
 * grid of them has one shape and a stage that swaps between them never changes height.
 */
export const Shot = ({
  src,
  alt,
  width,
  height,
  framed = true,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  /**
   * Off where the shot is tilted off the edge of its column rather than sat squarely in it: a
   * border and a shadow describe a rectangle, and there is no rectangle left once the image has
   * been turned and faded out at two of its edges.
   */
  framed?: boolean;
  className?: string;
}) => (
  <figure className={`shot ${framed ? "panel" : ""} ${className ?? ""}`}>
    <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
  </figure>
);
