/**
 * The engraved half of the brand, inside the application.
 *
 * A deliberate second copy of `apps/www/components/{engraving,filters}.tsx`, kept for the same
 * reason the two `globals.css` files re-declare the brand values rather than sharing one: the site
 * takes no workspace dependency (`apps/www/AGENTS.md`), and the two surfaces share a palette, not a
 * stylesheet. This is smaller than the site's — one plate and one screen, because the app needs the
 * texture in one place and the site is made of it.
 *
 * Where the site prints ink on a field, this prints ink on nothing: the plate lies over the app's
 * own canvas, so the filter emits its marks and leaves the ground transparent.
 *
 * `docs/DESIGN.md` rations this. It belongs to the arrival surfaces, which are seen once. A working
 * screen that grew an engraving would be the quiet half of the product borrowing the loud one's
 * voice, and that is the one thing the two halves are for.
 */

/** Bayer 8x8, row-major. Each cell is the threshold that pixel is measured against. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7,
  39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

const bayerTile = (): string => {
  const cells = BAYER.map((value, index) => {
    const level = Math.round((value / 64) * 255);
    return `<rect x='${index % 8}' y='${Math.floor(index / 8)}' width='1' height='1' fill='rgb(${level},${level},${level})'/>`;
  }).join("");
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'>${cells}</svg>`;
};

const RAYS = Array.from({ length: 96 }, (_, index) => {
  const angle = (index / 96) * Math.PI * 2;
  const reach = 132 + (index % 7) * 12 + (index % 3) * 9;
  return {
    x1: 160 + Math.cos(angle) * 34,
    y1: 160 + Math.sin(angle) * 34,
    x2: 160 + Math.cos(angle) * reach,
    y2: 160 + Math.sin(angle) * reach,
    width: index % 4 === 0 ? 2.4 : 1,
  };
});

/** The id the plate's filter is registered under. One screen, so one name. */
const SCREEN = "echo-app-dither";

/**
 * The threshold chain, dropped into the document once by whatever renders the plate.
 *
 * Tile an ordered 8x8 matrix across the region, subtract it from the source luminance, snap the
 * result to one bit, and paint what survives in the brand colour. That is the maths a 1980s printer
 * used, which is why it reads as newsprint rather than as a gradient — and it is why the plate stays
 * a few kilobytes of vector, generated at the resolution it is shown at.
 *
 * The ink is a custom property through `flood-color`, so the plate repaints with the theme and no
 * hex value lives in here.
 */
const Screen = () => (
  <filter id={SCREEN} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feImage
      href={bayerTile()}
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
    {/* Luminance to alpha: the lit bits become the mask, and the dark ones become nothing at all,
        which is what leaves the app's own canvas showing through between the marks. */}
    <feColorMatrix
      in="bits"
      type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.34 0.33 0 0"
      result="mask"
    />
    <feFlood style={{ floodColor: "var(--color-brand-bright)" }} result="ink" />
    <feComposite in="ink" in2="mask" operator="in" />
  </filter>
);

/**
 * The burst: ninety-six rays out of a lit centre, printed through the screen above.
 *
 * `aria-hidden`, because it says nothing. It is the ground the arrival screen's type sits on, and a
 * screen reader that announced it would be announcing wallpaper.
 */
export const Engraving = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 320 320"
    preserveAspectRatio="xMidYMid slice"
    className={className}
  >
    <defs>
      <Screen />
      <radialGradient id="echo-app-glow">
        <stop offset="0%" stopColor="white" />
        <stop offset="70%" stopColor="black" />
      </radialGradient>
    </defs>
    <g filter={`url(#${SCREEN})`}>
      <circle cx="160" cy="160" r="150" fill="url(#echo-app-glow)" />
      <g stroke="white" strokeLinecap="round">
        {RAYS.map((ray) => (
          <line
            key={`${ray.x1}-${ray.y1}`}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            strokeWidth={ray.width}
          />
        ))}
      </g>
      <circle cx="160" cy="160" r="36" fill="white" />
      <circle cx="160" cy="160" r="60" fill="none" stroke="white" strokeWidth="1.4" opacity="0.7" />
    </g>
  </svg>
);
