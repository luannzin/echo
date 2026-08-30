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
 * whole pixels — which is also why a browser handed one big PNG cannot produce a decent favicon,
 * and why both applications get an `.ico` holding the sizes rather than a single file to squash.
 *
 * One drawing, everywhere. The small sizes tighten the ladder — a finer cell, fewer and heavier
 * latitudes, and a painted ground instead of a screened one — but the orb is the screened orb at
 * sixteen pixels and at a thousand.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
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
 * @param cellPx    how many pixels one Bayer cell should occupy in the output. One device pixel
 *                  under 128, where eight cells have to carry the whole orb, and two above it
 */
const iconSvg = ({ size, orbScale = 1, cellPx = size <= 64 ? 1 : 2 }) => {
  // One Bayer cell should be `cellPx` device pixels. The tile holds 8 of them, and the viewBox is
  // 320 units wide however big the output is, so: tile = 8 * cellPx * 320 / size.
  const tile = (8 * cellPx * 320) / size;
  // Fewer and heavier the smaller it gets, and the third rung is the one the desktop set lives on:
  // fourteen latitudes inside 32 pixels is fourteen lines less than a pixel apart, which the dither
  // reads as one flat field. Six heavy ones survive being screened at that size.
  const bands = size >= 256 ? 22 : size >= 128 ? 14 : 6;
  const weight = size >= 256 ? 1.1 : size >= 128 ? 2.2 : 5;
  const rim = size >= 256 ? 2.4 : size >= 128 ? 4 : 7;

  /**
   * Whether the ground around the orb is screened too, or left as flat brand.
   *
   * Screening a black field leaves exactly one ink cell per 8x8 tile — the one the Bayer matrix
   * gives a zero. At 512 pixels that is thirty-two dots across and reads as the halftone it is; at
   * 64 it is eight specks in the margin and reads as dirt. So under 128 the ground is painted
   * solid and the screen is clipped to the plate, which is the same picture with nothing loose
   * around it. The orb itself is dithered at every size.
   */
  const field = size >= 128;
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
    <clipPath id="plate"><circle cx="160" cy="160" r="${(118 + rim / 2).toFixed(2)}"/></clipPath>
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
  ${field ? "" : `<rect width="320" height="320" fill="${BRAND}"/>`}
  <g${field ? "" : ' clip-path="url(#plate)"'} filter="url(#dither)">
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

/**
 * Every icon, re-encoded with an alpha channel it does not visually need.
 *
 * The drawing is opaque — a brand field with an orb on it — so Chromium writes a screenshot with no
 * alpha channel at all, colour type 2. Tauri's `generate_context!` refuses anything that is not
 * RGBA and fails the build with "icon 32x32.png is not RGBA", which is the whole reason this exists.
 * `omitBackground` would give an alpha channel by making the field transparent, which is a different
 * icon; the field is the icon. So the pixels are kept and a fully opaque channel is added beside
 * them.
 *
 * Written here rather than taken from a library for the same reason the `.ico` and the `.icns` are:
 * one command produces every icon echo ships, and it is one file with no dependency but the browser
 * that draws.
 */
const CRC = Int32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
};

/** Paeth, straight out of the PNG specification. The one filter that is not a subtraction. */
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

const toRgba = (source) => {
  if (source.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  const width = source.readUInt32BE(16);
  const height = source.readUInt32BE(20);
  const depth = source[24];
  const colour = source[25];
  if (source[28] !== 0) throw new Error("interlaced PNGs are not handled");
  if (depth !== 8 || (colour !== 2 && colour !== 6)) {
    throw new Error(`expected 8-bit RGB or RGBA, got depth ${depth} colour ${colour}`);
  }
  if (colour === 6) return source;

  const parts = [];
  for (let at = 8; at + 8 <= source.length; ) {
    const length = source.readUInt32BE(at);
    const type = source.toString("ascii", at + 4, at + 8);
    if (type === "IDAT") parts.push(source.subarray(at + 8, at + 8 + length));
    if (type === "IEND") break;
    at += 12 + length;
  }

  // Filters are relative to the pixels above and to the left, so undoing them means walking the
  // image once in order and keeping the line before.
  const raw = inflateSync(Buffer.concat(parts));
  const bpp = 3;
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? pixels[y * stride + x - bpp] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const corner = y > 0 && x >= bpp ? pixels[(y - 1) * stride + x - bpp] : 0;
      const delta =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? (left + up) >> 1
                : paeth(left, up, corner);
      pixels[y * stride + x] = (line[x] + delta) & 0xff;
    }
  }

  // Re-encoded unfiltered. These are eleven small images written once, and a filter that saves a
  // few kilobytes is not worth a second implementation of the same arithmetic backwards.
  const out = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const start = y * (width * 4 + 1);
    out[start] = 0;
    for (let x = 0; x < width; x++) {
      const from = y * stride + x * bpp;
      const to = start + 1 + x * 4;
      out[to] = pixels[from];
      out[to + 1] = pixels[from + 1];
      out[to + 2] = pixels[from + 2];
      out[to + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    source.subarray(0, 8),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(out, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

mkdirSync(WORK, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const spec of SPECS) {
  const page = await browser.newPage({ viewport: { width: spec.size, height: spec.size } });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:${BRAND}}svg{display:block}</style>${iconSvg(spec)}`,
  );
  await page.waitForTimeout(280);
  // Converted the moment it is drawn, so everything below this — the copies, the `.ico` and the
  // `.icns` payloads — is RGBA without knowing that it had to ask.
  writeFileSync(join(WORK, spec.name), toRgba(await page.screenshot()));
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

/**
 * An `.icns` is a four-byte magic, a big-endian total length, and then one chunk per size: a
 * four-character type, the chunk's own length, and the payload. macOS has read PNG payloads for
 * fifteen years, so the same files the `.ico` is built from are the whole content here too.
 *
 * Built rather than fetched from `iconutil`, for the same reason the `.ico` is: this script is the
 * one place an echo icon comes from, and a format that only one of three operating systems can
 * produce would leave the macOS build depending on which machine happened to run it. The types are
 * the modern set — `ic07` up — because the older ones carry a separate mask this drawing has no
 * use for.
 */
const buildIcns = (entries, target) => {
  const chunks = entries.map(([type, name]) => {
    const data = readFileSync(join(WORK, name));
    const header = Buffer.alloc(8);
    header.write(type, 0, "ascii");
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
  });
  const length = chunks.reduce((total, chunk) => total + chunk.length, 8);
  const header = Buffer.alloc(8);
  header.write("icns", 0, "ascii");
  header.writeUInt32BE(length, 4);
  writeFileSync(target, Buffer.concat([header, ...chunks]));
};

/**
 * The sizes a tab, a taskbar and a bundle all want, in one list because they all want the same
 * icon. A browser handed a single large PNG resamples it down to sixteen pixels itself and the
 * screen collapses into grey; an `.ico` hands it the drawing already solved at that size.
 */
const FAVICON = ["16.png", "32.png", "48.png", "64.png", "128.png", "256.png"];

const put = (from, to) => {
  const target = join(REPO, to);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(join(WORK, from)));
  console.log(`  ${to}`);
};

console.log("\napps/web:");
buildIco(FAVICON, join(REPO, "apps/web/app/favicon.ico"));
console.log("  apps/web/app/favicon.ico (16, 32, 48, 64, 128, 256)");
put("180.png", "apps/web/app/apple-icon.png");
put("192.png", "apps/web/public/icon-192.png");
put("512.png", "apps/web/public/icon-512.png");
put("maskable-512.png", "apps/web/public/icon-maskable-512.png");

console.log("\napps/desktop:");
put("32.png", "apps/desktop/src-tauri/icons/32x32.png");
put("128.png", "apps/desktop/src-tauri/icons/128x128.png");
put("256.png", "apps/desktop/src-tauri/icons/128x128@2x.png");
put("1024.png", "apps/desktop/src-tauri/icons/icon.png");
buildIco(FAVICON, join(REPO, "apps/desktop/src-tauri/icons/icon.ico"));
console.log("  apps/desktop/src-tauri/icons/icon.ico (16, 32, 48, 64, 128, 256)");
buildIcns(
  [
    ["ic07", "128.png"],
    ["ic08", "256.png"],
    ["ic09", "512.png"],
    ["ic10", "1024.png"],
    ["ic11", "32.png"],
    ["ic12", "64.png"],
    ["ic13", "512.png"],
    ["ic14", "1024.png"],
  ],
  join(REPO, "apps/desktop/src-tauri/icons/icon.icns"),
);
console.log("  apps/desktop/src-tauri/icons/icon.icns (32, 64, 128, 256, 512, 1024)");

console.log("\napps/www:");
// The same file the application ships, so a tab and a taskbar show one icon and not two drawings
// of it. An SVG favicon was the alternative and it cannot pick a different drawing per size the way
// a set can, which is the whole reason the small sizes are drawn separately at all.
buildIco(FAVICON, join(REPO, "apps/www/app/favicon.ico"));
console.log("  apps/www/app/favicon.ico (16, 32, 48, 64, 128, 256)");
