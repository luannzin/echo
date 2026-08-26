/**
 * The dither engine.
 *
 * Every engraving on this page is drawn as a grayscale vector and then reduced to one bit through
 * an ordered threshold: an 8x8 Bayer tile is repeated across the filter region, subtracted from the
 * source luminance, and the result is snapped to black or white. That is the same maths a 1980s
 * printer used, which is why the output reads as newsprint rather than as a gradient.
 *
 * The two colours come out of `feFlood`, and `flood-color` reads the same custom properties the
 * rest of the site is painted with — so a token change repaints the engravings too, and no filter
 * carries a hex value of its own.
 */

/** Bayer 8x8, row-major. Each cell is the threshold that pixel is measured against. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7,
  39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

const bayerTile = () => {
  const cells = BAYER.map((value, index) => {
    const level = Math.round((value / 64) * 255);
    const x = index % 8;
    const y = Math.floor(index / 8);
    return `<rect x='${x}' y='${y}' width='1' height='1' fill='rgb(${level},${level},${level})'/>`;
  }).join("");
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'>${cells}</svg>`;
};

/** A dot screen: the same threshold trick with a round ramp, which prints as halftone rosettes. */
const DOT_TILE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><defs><radialGradient id='d'><stop offset='0%' stop-color='white'/><stop offset='100%' stop-color='black'/></radialGradient></defs><rect width='6' height='6' fill='black'/><circle cx='3' cy='3' r='3' fill='url(%23d)'/></svg>";

type ScreenProps = { id: string; tile: string; ink: string; field: string };

/** One threshold chain: tile it, subtract it, snap to one bit, then paint the two halves. */
const Screen = ({ id, tile, ink, field }: ScreenProps) => (
  <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feImage
      href={tile}
      x="0"
      y="0"
      width="8"
      height="8"
      preserveAspectRatio="none"
      result="cell"
    />
    <feTile in="cell" result="screen" />
    <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray" />
    <feComposite
      in="gray"
      in2="screen"
      operator="arithmetic"
      k1="0"
      k2="1"
      k3="-1"
      k4="0.5"
      result="offset"
    />
    <feComponentTransfer in="offset" result="bits">
      <feFuncR type="discrete" tableValues="0 1" />
      <feFuncG type="discrete" tableValues="0 1" />
      <feFuncB type="discrete" tableValues="0 1" />
      <feFuncA type="discrete" tableValues="1 1" />
    </feComponentTransfer>
    <feColorMatrix
      in="bits"
      type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.34 0.33 0 0"
      result="mask"
    />
    <feFlood style={{ floodColor: `var(${ink})` }} result="inkField" />
    <feComposite in="inkField" in2="mask" operator="in" result="marks" />
    <feFlood style={{ floodColor: `var(${field})` }} result="ground" />
    <feMerge>
      <feMergeNode in="ground" />
      <feMergeNode in="marks" />
    </feMerge>
  </filter>
);

export const Filters = () => (
  <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute size-0">
    <title>Print screens</title>
    <defs>
      <Screen id="echo-dither" tile={bayerTile()} ink="--color-ink" field="--color-brand" />
      <Screen id="echo-dither-paper" tile={bayerTile()} ink="--color-brand" field="--color-paper" />
      <Screen id="echo-halftone" tile={DOT_TILE} ink="--color-ink" field="--color-brand-deep" />
    </defs>
  </svg>
);
