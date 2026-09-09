# Spacing scale (Ancient Lens)

Base: **16px = 1rem**. Spacing uses **rem** only (except `1px` hairlines / accent bar).

## Allowed steps

Prefer this ladder. Snap off-scale values to the nearest step unless sub-pixel
alignment is visibly required.

| Token (suggested) | rem | px |
|-------------------|-----|----|
| `--space-0` | 0 | 0 |
| `--space-1` | 0.25rem | 4 |
| `--space-2` | 0.5rem | 8 |
| `--space-3` | 0.75rem | 12 |
| `--space-4` | 1rem | 16 |
| `--space-5` | 1.25rem | 20 |
| `--space-6` | 1.5rem | 24 |
| `--space-8` | 2rem | 32 |
| `--space-10` | 2.5rem | 40 |
| `--space-12` | 3rem | 48 |
| `--space-16` | 4rem | 64 |

Half-steps (`0.125rem`) only for optical tweaks (icon alignment), not section gaps.

## Existing project tokens

Reuse before inventing:

| Token | Typical role |
|-------|----------------|
| `--page-pad-x` | Horizontal page gutter (default `2.5rem`) |
| `--page-max` | Content max width |

Optional to introduce when a role repeats:

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-section: var(--space-8); /* major blocks */
  --space-stack: var(--space-6); /* inside a section */
  --space-inline: var(--space-4); /* horizontal clusters */
}
```

## Role → step (defaults)

| Role | Default step | Notes |
|------|--------------|--------|
| Page gutter X | `--page-pad-x` / `--space-10` | Keep responsive overrides consistent |
| Main top pad | `--space-8` | Root may use modest clamp; avoid huge hero voids |
| Section → section | `--space-8` | Search → desk → footer band |
| Heading → body/list | `--space-3` … `--space-4` | Tight scorebook rhythm |
| Nav / icon gaps | `--space-2` … `--space-4` | Touch targets still ≥ ~2.75rem where interactive |
| Control padding | `--space-3` / `--space-4` | Inputs & primary button |
| List row block pad | `--space-3` … `--space-4` | Vertical padding inside rows |
| Footer pad | `--space-6` … `--space-8` | Match existing density |

## Conversion cheat sheet

| Avoid | Prefer |
|-------|--------|
| `padding: 8px` | `padding: var(--space-2)` or `0.5rem` |
| `gap: 12px` | `0.75rem` / `--space-3` |
| `margin-top: 0.35rem` | `0.25rem` or `0.5rem` |
| `gap: 2.25rem` | `2rem` or `2.5rem` |
| `padding: 18px 20px` | `1.125rem 1.25rem` → snap `1rem 1.25rem` if close enough |

## Out of scope for spacing tokens

- `border-width: 1px` / `0.1875rem` accent bar
- Font sizes, letter-spacing, line-height (typography pass)
- Radii (scorebook stays square unless already defined)
