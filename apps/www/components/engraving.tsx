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

export type Plate = "burst" | "orb" | "spiral" | "field" | "mesh" | "wave";

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
