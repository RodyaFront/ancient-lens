# Ancient Lens — match page overrides

Canonical visual direction is repository `DESIGN.md`.

## Product job

Tournament scorebook for one match: score, draft, tabular players, team
comparisons. Working surface — not a dashboard landing.

## Layout

1. Compact search strip above results (secondary to the scorebook).
2. Score card → scoreboard (sticky player column + horizontal scroll) → insights.
3. Keep player column sticky while scrolling metrics/items.
4. Filter chips expose `aria-pressed`; view tabs use arrow keys.

## Spacing

Use `--space-*` tokens from `match.css`. Prefer dense scorebook rhythm over
marketing voids. Touch targets for filter/tabs/actions ≥ `--space` control sizes
(~2.5–2.75rem).

## Anti-patterns

Breadcrumbs, MVP score widgets, purple neon, removing sticky player column,
shrinking type to avoid table scroll.
