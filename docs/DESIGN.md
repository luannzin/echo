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

Everything else comes from the coss neutral scale. The app is dark-only for now (`<html class="dark">`);
light mode is a token swap, not a redesign, because no component hard-codes a colour.

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
animating, so a component cannot opt out of that promise.

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
