/**
 * Regenerates the social cards: the picture a link to echo unfurls into on every surface that
 * reads Open Graph, from one drawing.
 *
 * Run it after changing the wordmark, the brand colour or a line of copy on the cards:
 *
 *     bunx playwright install chromium   # once, the same browser `icons.mjs` wants
 *     node scripts/og.mjs
 *
 * It is `assets/banner.svg` at another ratio and it is deliberately the same picture: the brand
 * field, the wordmark, the rule, the tracked line under it, the echoes leaving a source on the
 * right, and the dither ramp along the bottom. A reader who saw the README recognises the card,
 * and a reader who saw the card recognises the README.
 *
 * A browser draws it rather than a rasteriser, for the same reason `icons.mjs` uses one: the type
 * is the site's own, loaded as webfonts and measured by the engine that lays the site out. A run
 * with no network would silently fall back to Georgia and a system mono, and ship a card in
 * somebody else's type, so the fonts are asserted before anything is written.
 *
 * 1200x630 because that is what every reader of these tags scales from, and the text is sized for
 * the smallest place it lands: a card in a timeline is about 500 pixels wide, so the tagline is
 * set at a size that survives being halved.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The two brand tokens, resolved to sRGB. A PNG cannot read a CSS custom property. */
const BRAND = "#1a1aff";
const INK = "#f2f4ff";

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * The ramp along the bottom edge, drawn rather than filtered.
 *
 * Six bands of one 8x8 dot pattern at rising opacity, exactly as `assets/banner.svg` has it. The
 * banner draws it that way because GitHub strips SVG filters; this draws it that way because the
 * two have to be the same picture, and a real ordered dither here would not match one there.
 */
const DOTS = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><rect width='4' height='4' fill='${INK.replace("#", "%23")}'/></svg>`;

/** The echoes: one source on the right, rings leaving it and thinning as they go. */
const RINGS = [
  [70, 3, 0.55],
  [150, 3, 0.42],
  [240, 2.5, 0.31],
  [340, 2.5, 0.22],
  [450, 2, 0.15],
  [570, 2, 0.1],
  [700, 2, 0.07],
]
  .map(
    ([r, width, opacity]) =>
      `<circle cx="1010" cy="300" r="${r}" stroke-width="${width}" stroke-opacity="${opacity}"/>`,
  )
  .join("");

/**
 * @param tagline  the one sentence, tracked capitals, the largest thing after the wordmark
 * @param eyebrow  the four claims, quieter, the same four the hero and the banner make
 * @param address  where this card came from, so a screenshot of it still says where to go
 */
const card = ({ tagline, eyebrow, address }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Instrument+Serif&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; position: relative; overflow: hidden;
    background: ${BRAND}; color: ${INK};
  }
  svg.echoes { position: absolute; inset: 0; }
  .plate { position: absolute; left: 96px; top: 168px; }
  .mark {
    font-family: "Instrument Serif", Georgia, serif; font-size: 178px; line-height: 0.86;
    letter-spacing: -0.01em;
  }
  .rule { width: 520px; height: 1.5px; background: ${INK}; opacity: 0.34; margin: 34px 0 0; }
  .tagline, .eyebrow, .address {
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase; white-space: nowrap;
  }
  .tagline { font-size: 25px; letter-spacing: 0.26em; opacity: 0.92; margin-top: 30px; }
  .eyebrow { font-size: 16px; letter-spacing: 0.2em; opacity: 0.62; margin-top: 22px; }
  .address {
    position: absolute; left: 98px; bottom: 74px; font-size: 19px; letter-spacing: 0.14em;
    text-transform: none; border: 1.5px solid rgba(242, 244, 255, 0.42); border-radius: 999px;
    padding: 11px 22px;
  }
  /* Densest at the edge the page continues into, the same five steps as the banner. */
  .ramp { position: absolute; left: 0; right: 0; bottom: 0; height: 40px; }
  .ramp i { display: block; height: 8px; background: url("${DOTS}"); }
</style></head>
<body>
  <svg class="echoes" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" stroke="${INK}">
    ${RINGS}
    <circle cx="1010" cy="300" r="14" fill="${INK}" stroke="none"/>
  </svg>
  <div class="plate">
    <div class="mark">echo</div>
    <div class="rule"></div>
    <div class="tagline">${tagline}</div>
    <div class="eyebrow">${eyebrow}</div>
  </div>
  <div class="address">${address}</div>
  <div class="ramp">
    <i style="opacity:0.06"></i><i style="opacity:0.11"></i><i style="opacity:0.18"></i>
    <i style="opacity:0.27"></i><i style="opacity:0.38"></i>
  </div>
</body></html>`;

/**
 * One card per document that can be shared, and there are three of them: the site in each of its
 * two languages, and the hosted app, which is the link most people are actually handed. They say
 * different things because they are different promises: the site describes echo, the app opens it.
 * The address on each is the one it was cut for.
 */
const SPECS = [
  {
    file: "apps/www/public/og.png",
    tagline: "The note taker that learns with you",
    eyebrow: "No AI · Open source · Runs on your machine · No account",
    address: "useecho.dev",
  },
  {
    file: "apps/www/public/og-pt.png",
    tagline: "O bloco de notas que aprende com você",
    eyebrow: "Sem IA · Código aberto · Roda na sua máquina · Sem conta",
    address: "useecho.dev/pt-br",
  },
  {
    file: "apps/web/public/og.png",
    tagline: "The note taker that learns with you",
    eyebrow: "Opens in your browser · Nothing to install · No account",
    address: "app.useecho.dev",
  },
];

const browser = await chromium.launch({ headless: true });
for (const spec of SPECS) {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.setContent(card(spec), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // Loudly rather than quietly. A card set in Georgia is not a smaller mistake than a card that
  // failed to render: it is one nobody notices until it is on a timeline.
  const drawn = await page.evaluate(() => ({
    serif: document.fonts.check('178px "Instrument Serif"'),
    mono: document.fonts.check('25px "Geist Mono"'),
  }));
  if (!drawn.serif || !drawn.mono) {
    throw new Error(
      `webfonts did not load (Instrument Serif: ${drawn.serif}, Geist Mono: ${drawn.mono}). This needs a network.`,
    );
  }

  const target = join(REPO, spec.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, await page.screenshot());
  await page.close();
  console.log(`  ${spec.file}`);
}
await browser.close();
