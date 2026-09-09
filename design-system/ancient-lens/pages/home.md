# Ancient Lens — home (root) page overrides

Canonical visual direction is repository `DESIGN.md`, not generic gaming/purple
recommendations from ui-ux-pro-max `--design-system`.

## Product

Dota 2 match scorebook. Working surface, not a marketing landing page.

## Must keep

- Charcoal `#171a18`, vermilion `#ed644b`, Radiant/Dire green-red, gold for NW
- IBM Plex Sans + Roboto Condensed
- Flat panels, square edges, no gradients/glass/sparkles
- Compact masthead + literal match search as first job
- Ukrainian UI copy

## Root `/`

1. Masthead + match search. No auto-loaded match.
2. Below search, only when data exists in this browser:
   - **Недавні** — last opened live matches (`localStorage`)
   - **Закладки** — explicitly saved matches
3. Do **not** surface test fixtures in production UI.
4. Submit → `/match/:id`. «Огляд» is `aria-current` only on `/`.

## Match `/match/:id`

Live OpenDota. `?snapshot=1` exists for automated tests / offline fixture only —
not linked from the product UI.

## Anti-patterns

Feature-grid landing, demo/test match as homepage content, CTA “open example”,
purple neon palettes.
