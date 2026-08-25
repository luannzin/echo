# Design direction

Two surfaces, one brand. The references split cleanly along that line and the system follows them.

| Surface | Reference | Character |
| --- | --- | --- |
| Marketing (landing, docs) | Hermes Agent | Electric blue field, oversized high-contrast serif caps, mono micro-labels, engraved/halftone imagery. Loud on purpose. |
| Application (shell, editor) | Grok desktop + mobile | Near-black canvas, icon rail, generous void, content centred, chrome almost invisible. Quiet on purpose. |

The two are held together by three shared elements: the electric blue, the mono uppercase
micro-label, and the display serif used for hero-scale type only.

## Colour

Tokens live in `apps/web/app/globals.css`.

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

**Sigurd** is the face in the Hermes reference and is commercially licensed — it is not in the
repository. Instrument Serif stands in: same didone-ish high contrast, free, and loadable through
`next/font`. Swapping it later is one declaration in `apps/web/app/layout.tsx`; nothing else
references the face by name.

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

Small, fast, and skippable: 120–200ms, ease-out, opacity and 2–4px translation only. Nothing
bounces. `prefers-reduced-motion` collapses every duration to ~0 in `globals.css`, globally, so a
component cannot opt out of that promise.

## Component policy

- coss primitives live in `apps/web/components/ui/` and are **registry-managed** — the shadcn CLI
  overwrites them. They are excluded from Biome in `biome.json`. Do not hand-edit them; wrap or
  compose instead.
- Product components live in `apps/web/components/`, styled with tokens only. A raw hex value in a
  product component is a bug.
- Shared primitives get promoted to `packages/ui` only when a second consumer actually exists.
