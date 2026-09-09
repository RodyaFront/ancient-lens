# Ancient Lens — match page overrides

Canonical visual direction is repository `DESIGN.md`.

## Product job

Tournament scorebook for one match: score, draft, tabular players, team
comparisons. Working surface — not a dashboard landing.

## Layout

1. **Shared search chrome** with home (`main.page-match`): identical `padding`,
   `border-bottom`, heading size/weight, and blurb. Differentiate only _below_
   the strip (loading / `result-region`). Never drive search styles with
   `:has(.result-region)` — that flips mid-load and jumps the page.
2. While loading: scorebook-shaped skeleton + stage copy under the same strip;
   then score card → scoreboard (sticky player column + horizontal scroll) →
   insights. Score reveal and table row stagger can run together.
3. Keep player column sticky while scrolling metrics/items.
4. Filter chips expose `aria-pressed`; view tabs use arrow keys.

## Spacing

Use `--space-*` tokens from `match.css`. Prefer dense scorebook rhythm over
marketing voids _below_ search. Touch targets for filter/tabs/actions ≥ `--space`
control sizes (~2.5–2.75rem).

## Anti-patterns

Breadcrumbs, MVP score widgets, purple neon, removing sticky player column,
shrinking type to avoid table scroll.
