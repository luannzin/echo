/**
 * Regenerates every application icon from one drawing: the `orb` plate out of
 * `apps/www/components/engraving.tsx`, the same one printed behind "Three commands and it is
 * yours", on the brand field and through the site's own Bayer dither.
 *
 * Run it after changing the plate, the brand colour, or the icon set:
 *
 *     bunx playwright install chromium   # once
 *     node scripts/icons.mjs
 *
 * It needs a real renderer because the dither is an SVG filter chain, and nothing but a browser
 * runs one. Playwright is deliberately not a workspace dependency: this is run by hand roughly
 * never, and the alternative is carrying a browser download in every install.
 *
 * Per size rather than one master resampled down, because the screen is an 8x8 tile measured in
 * user units: scaling one file from 1024 to 32 takes the tile with it and the pattern collapses
 * into grey. Each output is drawn at its own size with the tile solved so one Bayer cell lands on
 * whole pixels, and at or below 64px the screen is dropped for a flat silhouette, because one cell
 * cannot be smaller than one pixel.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(REPO, "scripts", ".icons");

/** The two brand tokens, resolved to sRGB. An icon cannot read a CSS custom property. */
const BRAND = "#0015fc";
const INK = "#f1f5fe";

/** Bayer 8x8, row-major, exactly as `apps/www/components/filters.tsx` has it. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7,
  39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

const bayerTile = () => {
  const cells = BAYER.map((value, index) => {
    const level = Math.round((value / 64) * 255);
    return `<rect x='${index % 8}' y='${Math.floor(index / 8)}' width='1' height='1' fill='rgb(${level},${level},${level})'/>`;
  }).join("");
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'>${cells}</svg>`;
};

/**
 * The sphere's latitudes. Fewer and heavier as the icon gets smaller: twenty-two bands inside 128
 * pixels is twenty-two lines a pixel apart, which renders as a flat grey disc.
 */
const latitudes = (count) =>
  Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / (count + 1);
    return {
      y: 40 + t * 240,
      rx: 120 * Math.sin(t * Math.PI),
      ry: 12 + 10 * Math.sin(t * Math.PI),
    };
  });

/**
 * @param size      rendered pixels, square
 * @param orbScale  1 is the plate's own proportion; the maskable icon shrinks it into the safe zone
 * @param cellPx    how many pixels one Bayer cell should occupy in the output
 */
const iconSvg = ({ size, orbScale = 1, cellPx = 2 }) => {
  if (size <= 64) {
    // The orb as it looks from far away: a disc with three bands through it. The rings are clipped
    // by construction here, since none of them reaches the silhouette.
    const flat = [0.3, 0.5, 0.7]
      .map((t) => {
        const y = 160 + (t - 0.5) * 224;
        const rx = 112 * Math.sin(t * Math.PI);
        const ry = 10 + 8 * Math.sin(t * Math.PI);
        return `<ellipse cx="160" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/>`;
      })
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 320 320">
  <title>echo</title>
  <rect width="320" height="320" fill="${BRAND}"/>
  <g transform="translate(160 160) scale(${orbScale}) translate(-160 -160)">
    <circle cx="160" cy="160" r="118" fill="${INK}"/>
    <g fill="none" stroke="${BRAND}" stroke-width="13">${flat}</g>
  </g>
</svg>`;
  }

  // One Bayer cell should be `cellPx` device pixels. The tile holds 8 of them, and the viewBox is
  // 320 units wide however big the output is, so: tile = 8 * cellPx * 320 / size.
  const tile = (8 * cellPx * 320) / size;
  const bands = size >= 256 ? 22 : 14;
  const weight = size >= 256 ? 1.1 : 2.2;
  const rim = size >= 256 ? 2.4 : 4;
  const rings = latitudes(bands)
    .map(
      (b) =>
        `<ellipse cx="160" cy="${b.y.toFixed(2)}" rx="${b.rx.toFixed(2)}" ry="${b.ry.toFixed(2)}"/>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 320 320">
  <title>echo</title>
  <defs>
    <clipPath id="ball"><circle cx="160" cy="160" r="118"/></clipPath>
    <radialGradient id="sphere" cx="36%" cy="30%">
      <stop offset="0%" stop-color="white"/>
      <stop offset="55%" stop-color="#707070"/>
      <stop offset="100%" stop-color="black"/>
    </radialGradient>
    <filter id="dither" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage href="${bayerTile()}" x="0" y="0" width="${tile.toFixed(4)}" height="${tile.toFixed(4)}" preserveAspectRatio="none" result="cell"/>
      <feTile in="cell" result="screen"/>
      <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/>
      <feComposite in="gray" in2="screen" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0.5" result="offset"/>
      <feComponentTransfer in="offset" result="bits">
        <feFuncR type="discrete" tableValues="0 1"/>
        <feFuncG type="discrete" tableValues="0 1"/>
        <feFuncB type="discrete" tableValues="0 1"/>
        <feFuncA type="discrete" tableValues="1 1"/>
      </feComponentTransfer>
      <feColorMatrix in="bits" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.34 0.33 0 0" result="mask"/>
      <feFlood flood-color="${INK}" result="inkField"/>
      <feComposite in="inkField" in2="mask" operator="in" result="marks"/>
      <feFlood flood-color="${BRAND}" result="ground"/>
      <feMerge><feMergeNode in="ground"/><feMergeNode in="marks"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#dither)">
    <rect width="320" height="320" fill="black"/>
    <g transform="translate(160 160) scale(${orbScale}) translate(-160 -160)">
      <circle cx="160" cy="160" r="118" fill="url(#sphere)"/>
      <g clip-path="url(#ball)" fill="none" stroke="white" stroke-width="${weight}" opacity="0.85">${rings}</g>
      <circle cx="160" cy="160" r="118" fill="none" stroke="white" stroke-width="${rim}"/>
    </g>
  </g>
</svg>`;
};

const SPECS = [
  { name: "16.png", size: 16 },
  { name: "32.png", size: 32 },
  { name: "48.png", size: 48 },
  { name: "64.png", size: 64 },
  { name: "128.png", size: 128 },
  { name: "180.png", size: 180 },
  { name: "192.png", size: 192 },
  { name: "256.png", size: 256 },
  { name: "512.png", size: 512 },
  { name: "1024.png", size: 1024, cellPx: 3 },
  { name: "maskable-512.png", size: 512, orbScale: 0.62 },
];

mkdirSync(WORK, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const spec of SPECS) {
  const page = await browser.newPage({ viewport: { width: spec.size, height: spec.size } });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:${BRAND}}svg{display:block}</style>${iconSvg(spec)}`,
  );
  await page.waitForTimeout(280);
  await page.screenshot({ path: join(WORK, spec.name) });
  await page.close();
  console.log(`  drew ${spec.name} (${spec.size}px)`);
}
await browser.close();

/**
 * An `.ico` is a small directory followed by payloads, and every payload may simply be a PNG.
 * Width and height are one byte each, where 0 means 256.
 */
const buildIco = (names, target) => {
  const images = names.map((n) => {
    const data = readFileSync(join(WORK, n));
    return { data, width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  });
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + entries.length;
  images.forEach((image, index) => {
    const at = index * 16;
    entries.writeUInt8(image.width >= 256 ? 0 : image.width, at);
    entries.writeUInt8(image.height >= 256 ? 0 : image.height, at + 1);
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(image.data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += image.data.length;
  });
  writeFileSync(target, Buffer.concat([header, entries, ...images.map((i) => i.data)]));
};

const put = (from, to) => {
  const target = join(REPO, to);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(join(WORK, from)));
  console.log(`  ${to}`);
};

console.log("\napps/web:");
put("512.png", "apps/web/app/icon.png");
put("180.png", "apps/web/app/apple-icon.png");
put("192.png", "apps/web/public/icon-192.png");
put("512.png", "apps/web/public/icon-512.png");
put("maskable-512.png", "apps/web/public/icon-maskable-512.png");

console.log("\napps/desktop:");
put("32.png", "apps/desktop/src-tauri/icons/32x32.png");
put("128.png", "apps/desktop/src-tauri/icons/128x128.png");
put("256.png", "apps/desktop/src-tauri/icons/128x128@2x.png");
put("1024.png", "apps/desktop/src-tauri/icons/icon.png");
buildIco(
  ["16.png", "32.png", "48.png", "64.png", "128.png", "256.png"],
  join(REPO, "apps/desktop/src-tauri/icons/icon.ico"),
);
console.log("  apps/desktop/src-tauri/icons/icon.ico (16, 32, 48, 64, 128, 256)");

console.log("\napps/www:");
// Scalable, so it gets the flat drawing: a browser paints a favicon between 16 and 32 pixels, where
// the screen would be noise, and one SVG cannot pick a different drawing per size the way a set can.
writeFileSync(
  join(REPO, "apps/www/app/icon.svg"),
  `${iconSvg({ size: 64 })
    .replace(' width="64" height="64"', "")
    .replace('<g transform="translate(160 160) scale(1) translate(-160 -160)">', "<g>")}\n`,
);
console.log("  apps/www/app/icon.svg");
