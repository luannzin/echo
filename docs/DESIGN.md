# Design direction

Two surfaces, one brand.

| Surface | Character |
| --- | --- |
| Marketing (`apps/www`) | Electric blue field, oversized high-contrast serif caps, mono micro-labels, dithered engravings. Loud on purpose. |
| Application (shell, editor) | Near-black canvas, icon rail, generous void, content centred, chrome almost invisible. Quiet on purpose. |

The two are held together by three shared elements: the electric blue, the mono uppercase
micro-label, and the display serif used for hero-scale type only.

## Colour

Tokens live in `apps/web/app/globals.css`, and the marketing site re-declares the same three brand
values in `apps/www/app/globals.css` — the two surfaces share a palette, not a stylesheet.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand` | `oklch(45.5% 0.305 264)` | Marketing background fields, large blocks of blue |
| `--color-brand-bright` | `oklch(58% 0.26 264)` | Focus rings, selected state, the one accent inside the app |
| `--color-brand-ink` | `oklch(97% 0.012 264)` | Text and marks sitting on a brand field |

Everything else comes from the coss neutral scale. Both palettes are real: light at `:root` and dark
under `.dark`, and the theme is that class and nothing else — no component hard-codes a colour, so
the swap was tokens rather than a redesign. Dark is the default and the failure mode: the markup
ships with `class="dark"` and the bootstrap script in `apps/web/app/layout.tsx` only ever takes it
off, so a window where that script cannot run stays dark rather than flashing white.

Settings offers dark, light, and following the machine. Motion has the same shape: `data-echo-motion`
on `<html>` points the same way `prefers-reduced-motion` does, and there is deliberately no value
that asks for **more** motion than the machine asked for.

Blue is rationed inside the application: focus, selection, and one active state. If a screen shows
blue in three places, two of them are wrong.

## Type

| Role | Face | Token |
| --- | --- | --- |
| Interface | Geist | `--font-sans` |
| Micro-labels, code, shortcuts | Geist Mono, uppercase, `0.14em` tracking | `--font-mono` |
| Hero and marketing display | Instrument Serif | `--font-display` |

Instrument Serif is the display face today: high didone contrast, free, loadable through
`next/font`. A licensed face can replace it with one declaration in `apps/web/app/layout.tsx` —
nothing else names a font.

## Shell anatomy

```text
┌──┬───────────┬───────────────────────────┬──────────────┐
│  │           │ top bar (quiet, 48px)     │              │
│ra│navigation ├───────────────────────────┤ intelligence │
│il│  folders  │                           │   related    │
│56│  projects │        workspace          │  suggestions │
│px│  recent   │                           │   metadata   │
└──┴───────────┴───────────────────────────┴──────────────┘
```

The rail is icon-only with tooltips, it never expands, and it dissolves into the canvas —
`--sidebar` equals `--background` deliberately. Navigation and intelligence panels collapse; the
workspace never does.

Items that do not exist yet are rendered disabled and say which phase brings them. No fake data, no
dead links.

## Motion

Small, fast, and skippable: 150–260ms, ease-out (`--ease-out-quart`), opacity and small translation
only. Nothing bounces. Two motions carry the product:

- **The composer travels.** Moving between the writing space and the stream re-creates the composer
  in a different subtree, so it animates with FLIP (`lib/flip.ts`, 340ms) rather than a transition —
  the same movement whether it was triggered by saving, by the toggle, or by the rail.
- **Entries rise.** Notes enter the stream with a 6px rise, staggered 28ms and capped at eight, so a
  long stream never feels like it is dealing cards.

`prefers-reduced-motion` collapses every duration to ~0 in `globals.css` and FLIP checks it before
animating, so a component cannot opt out of that promise. `:root[data-echo-motion="reduced"]` does the
same, for the reader who asked in settings rather than in the operating system.

### The one exception

The **arrival surfaces** — the first-run screen, the tour's coach marks, the checklist finishing — are
the one place inside the application where the loud half of the brand is used. They are seen once.
Everything a reader sees on the second day stays quiet.

What crosses over, and nothing else:

- **The dither and the burst plate**, in `apps/web/shared/_components/engraving.tsx`. A deliberate
  second copy of the site's, kept for the same reason the two `globals.css` files re-declare the
  brand values: `apps/www` takes no workspace dependency, and the two surfaces share a palette
  rather than a stylesheet. The app's copy prints ink on nothing, so the plate lies over the app's
  own canvas instead of carrying a field of its own.
- **`.plate-drift`**, clock-driven CSS inside `prefers-reduced-motion: no-preference`. Six percent
  over thirty-four seconds, which is under a pixel a second: light, not something moving.
- **The travelling spotlight.** One fixed element with a `100vmax` ring of shadow and the anchor's
  rectangle punched out, transitioning `top/left/width/height` on `--ease-out-quart`. It carries no
  pointer events, so the control it is lighting stays clickable underneath — a tour that has to be
  dismissed before the thing it describes can be tried is a slideshow.
- **A tick that draws itself**, on `stroke-dashoffset`. The mark is the reward, and a checkmark that
  simply exists on the next render is not one.

Still nothing bounces.

## The marketing surface

Everything on the site is drawn rather than photographed. `apps/www/components/engraving.tsx` emits
greyscale plates from loops, and `apps/www/components/filters.tsx` reduces them to one bit through an
ordered 8x8 Bayer threshold (`feImage` + `feTile` + a discrete transfer) or a dot screen. Both output
colours come from `feFlood` reading the brand custom properties, so the plates repaint with the
tokens and no filter carries a hex value.

Three effects carry the page and none of them is JavaScript:

- **Grain.** One turbulence tile over the whole document, `mix-blend-mode: overlay`.
- **Parallax.** Plates drift inside their frames on `animation-timeline: view()`.
- **Reveal.** Cards rise as they enter, on the same timeline.

All three sit inside `@media (prefers-reduced-motion: no-preference)`, and a browser with no view
timelines renders the finished state instead of a fallback.

## Contrast

On the site, type sits on top of bright plates, so it is measured against the plate: platform card
labels come in at 5.6:1 against the lightest part of the engraving behind them and display type at
4.3:1. In the app, body text sits at ~15.8:1. Secondary text (`--muted-foreground`) is neutral-400, measured at 6.7:1
on the composer surface and 7:1 on the canvas — neutral-500 came in at 4.4:1, under the 4.5 floor,
which is why the token moved. Anything added here gets measured, not eyeballed.

## Component policy

- coss primitives live in `apps/web/components/ui/` and are **registry-managed** — the shadcn CLI
  overwrites them. They are excluded from Biome in `biome.json`. Do not hand-edit them; wrap or
  compose instead.
- Product components live in `apps/web/components/`, styled with tokens only. A raw hex value in a
  product component is a bug.
- Shared primitives get promoted to `packages/ui` only when a second consumer actually exists.
