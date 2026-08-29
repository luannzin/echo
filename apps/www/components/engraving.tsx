/**
 * The imagery.
 *
 * Nothing here is a photograph. Each plate is drawn from a loop (rays, latitudes, a spiral, a
 * ruled field) in greyscale, and the dither filter turns it into print. That keeps the site at a
 * few kilobytes of vector instead of a folder of images, and it means the art is generated at the
 * resolution it is displayed at rather than resampled to it.
 */

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

const LATITUDES = Array.from({ length: 22 }, (_, index) => {
  const t = (index + 1) / 23;
  return { y: 40 + t * 240, rx: 120 * Math.sin(t * Math.PI), ry: 12 + 10 * Math.sin(t * Math.PI) };
});

const SPIRAL = Array.from({ length: 480 }, (_, index) => {
  const angle = (index / 480) * Math.PI * 14;
  const radius = 6 + angle * 7.4;
  return `${index === 0 ? "M" : "L"}${(160 + Math.cos(angle) * radius).toFixed(1)} ${(160 + Math.sin(angle) * radius * 0.86).toFixed(1)}`;
}).join("");

const SCANLINES = Array.from({ length: 46 }, (_, index) => ({
  y: index * 7.2,
  width: 0.8 + (index % 5) * 0.9,
}));

const MESH = Array.from({ length: 26 }, (_, index) => index / 25);

/**
 * The cup, ruled like the orb's latitudes so it reads as engraved rather than drawn: the body is a
 * stack of ellipses that narrow towards the base, which is what gives a flat taper its volume.
 */
const CUP_RULES = Array.from({ length: 13 }, (_, index) => {
  const t = (index + 1) / 14;
  return { y: 154 + t * 62, rx: 58 - t * 20, ry: 4 + (1 - t) * 6 };
});

/**
 * Three curls of steam, widening as they rise and thinning as they go. The amplitude is multiplied
 * by `t` so each one leaves the surface straight and only starts to wander further up, which is the
 * difference between steam and a decorative squiggle.
 */
const STEAM = [-38, 2, 38].map((offset, index) => ({
  key: `steam-${offset}`,
  width: 2.2 - index * 0.3,
  d: Array.from({ length: 30 }, (_, step) => {
    const t = step / 29;
    const y = 132 - t * (132 - (38 + (index % 2) * 16));
    const x = 160 + offset + Math.sin(t * Math.PI * 2.1 + index * 1.7) * (11 + index * 4) * t;
    return `${step === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(""),
}));

export type Plate = "burst" | "orb" | "spiral" | "field" | "mesh" | "wave" | "cup";

const plates: Record<Plate, React.ReactNode> = {
  burst: (
    <>
      <circle cx="160" cy="160" r="150" fill="url(#glow)" />
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
    </>
  ),
  orb: (
    <>
      <circle cx="160" cy="160" r="118" fill="url(#sphere)" />
      <g fill="none" stroke="white" strokeWidth="1.1" opacity="0.85">
        {LATITUDES.map((band) => (
          <ellipse key={band.y} cx="160" cy={band.y} rx={band.rx} ry={band.ry} />
        ))}
      </g>
      <circle cx="160" cy="160" r="118" fill="none" stroke="white" strokeWidth="2.4" />
    </>
  ),
  spiral: (
    <>
      <rect width="320" height="320" fill="url(#corner)" />
      <path d={SPIRAL} fill="none" stroke="white" strokeWidth="1.6" />
    </>
  ),
  field: (
    <>
      <rect width="320" height="320" fill="url(#drift)" />
      <g stroke="white">
        {SCANLINES.map((line) => (
          <line key={line.y} x1="-10" y1={line.y} x2="330" y2={line.y} strokeWidth={line.width} />
        ))}
      </g>
      <circle cx="196" cy="132" r="66" fill="black" />
      <circle cx="196" cy="132" r="66" fill="url(#glow)" />
    </>
  ),
  mesh: (
    <>
      <rect width="320" height="320" fill="url(#drift)" />
      <g stroke="white" strokeWidth="1" fill="none">
        {MESH.map((t) => (
          <path key={t} d={`M${t * 320} 0 L${160 + (t - 0.5) * 90} 320`} />
        ))}
        {MESH.map((t) => (
          <path key={`h${t}`} d={`M0 ${320 * t ** 2.1} L320 ${320 * t ** 2.1}`} />
        ))}
      </g>
    </>
  ),
  wave: (
    <>
      <rect width="320" height="320" fill="url(#corner)" />
      <g fill="none" stroke="white" strokeWidth="1.3">
        {MESH.map((t) => (
          <path
            key={t}
            d={`M-10 ${40 + t * 300} Q 90 ${40 + t * 300 - 70 * Math.sin(t * 3.1)} 160 ${40 + t * 300} T 330 ${40 + t * 300}`}
          />
        ))}
      </g>
      <circle cx="160" cy="160" r="54" fill="white" />
      <circle cx="160" cy="160" r="54" fill="url(#sphere)" />
    </>
  ),
  /**
   * The only plate that is a thing rather than a pattern, and it is still a plate: greyscale line
   * work over a gradient, printed through the same dither as the rays and the spiral. Drawn rather
   * than fetched as an icon so it holds at any size and takes its two colours from the theme.
   */
  cup: (
    <>
      <circle cx="160" cy="150" r="152" fill="url(#glow)" opacity="0.5" />

      <g fill="none" stroke="white" strokeLinecap="round" opacity="0.8">
        {STEAM.map((curl) => (
          <path key={curl.key} d={curl.d} strokeWidth={curl.width} />
        ))}
      </g>

      {/* The saucer, under everything, so the cup sits on it rather than in front of it. */}
      <ellipse cx="160" cy="242" rx="108" ry="22" fill="none" stroke="white" strokeWidth="2.4" />
      <ellipse
        cx="160"
        cy="238"
        rx="80"
        ry="15"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.75"
      />

      {/* The handle is drawn twice: a wide white stroke, then a narrower black one down its middle,
          which is how a loop reads as a ring rather than as a solid ear. */}
      <path d="M212 174 C 262 170 264 214 203 210" fill="none" stroke="white" strokeWidth="7" />
      <path d="M212 174 C 262 170 264 214 203 210" fill="none" stroke="black" strokeWidth="2.4" />

      <path d="M102 154 L120 220 Q160 236 200 220 L218 154 Z" fill="url(#sphere)" />
      <g fill="none" stroke="white" strokeWidth="1" opacity="0.62">
        {CUP_RULES.map((rule) => (
          <ellipse key={rule.y} cx="160" cy={rule.y} rx={rule.rx} ry={rule.ry} />
        ))}
      </g>
      <path
        d="M102 154 L120 220 Q160 236 200 220 L218 154"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
      />

      {/* The rim last, and the coffee inside it lit from the same corner as every other plate. */}
      <ellipse cx="160" cy="154" rx="58" ry="16" fill="black" />
      <ellipse cx="160" cy="154" rx="58" ry="16" fill="url(#glow)" />
      <ellipse cx="160" cy="154" rx="58" ry="16" fill="none" stroke="white" strokeWidth="2.6" />
      <ellipse
        cx="160"
        cy="154"
        rx="42"
        ry="10"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.55"
      />
    </>
  ),
};

type EngravingProps = {
  plate: Plate;
  className?: string;
  /** Which screen prints it: ink on the blue field, blue on paper, or a halftone dot screen. */
  screen?: "dither" | "dither-paper" | "halftone";
  style?: React.CSSProperties;
};

export const Engraving = ({ plate, className, screen = "dither", style }: EngravingProps) => (
  <svg
    viewBox="0 0 320 320"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
    className={`${screen} ${className ?? ""}`}
    style={style}
  >
    <title>Engraved plate</title>
    <defs>
      <radialGradient id="glow">
        <stop offset="0%" stopColor="white" />
        <stop offset="42%" stopColor="#8a8a8a" />
        <stop offset="100%" stopColor="black" />
      </radialGradient>
      <radialGradient id="sphere" cx="36%" cy="30%">
        <stop offset="0%" stopColor="white" />
        <stop offset="55%" stopColor="#707070" />
        <stop offset="100%" stopColor="black" />
      </radialGradient>
      <linearGradient id="drift" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stopColor="#d0d0d0" />
        <stop offset="100%" stopColor="black" />
      </linearGradient>
      <linearGradient id="corner" x1="0.1" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="black" />
        <stop offset="60%" stopColor="#9a9a9a" />
        <stop offset="100%" stopColor="#f0f0f0" />
      </linearGradient>
    </defs>
    <rect width="320" height="320" fill="black" />
    {plates[plate]}
  </svg>
);
