---
name: spacing-system
description: >-
  Aligns padding, margin, and gap to a rem spacing scale with role-based tokens.
  Use when the user asks to normalize spacing, fix uneven paddings/margins/gaps,
  apply a spacing system to a page, or mentions vertical rhythm / отступы / spacing
  tokens. Pass a page route or file path as the target.
argument-hint: "[page route or path, e.g. / or app/pages/index.vue]"
---

# Spacing system

Normalize **padding / margin / gap** on a target page so spacing reads as one
system, not one-off numbers.

## Arguments

`$ARGUMENTS` = page target. Accept any of:

- Route: `/`, `/match/[id]`
- Page file: `app/pages/index.vue`
- Feature folder: `app/components/HomeDesk.vue` (+ related CSS)

If missing, ask which page — do not guess across the whole app.

## Canon (this repo)

1. Read `DESIGN.md` and `design-system/ancient-lens/` (and `pages/<page>.md` if any).
2. Primary styles for scorebook UI: `app/assets/css/match.css`.
3. Working surface / tournament scorebook — not marketing hero spacing.
4. Follow [references/scale.md](references/scale.md) for the scale and roles.

## Workflow

Copy and track:

```
Spacing pass:
- [ ] 1. Resolve target files (page + shell CSS/components in scope)
- [ ] 2. Inventory current spacing values
- [ ] 3. Map roles → scale steps / tokens
- [ ] 4. Apply minimal CSS (and Vue class) diff
- [ ] 5. Verify desktop + narrow mobile
- [ ] 6. typecheck if Vue touched; report before/after map
```

### 1. Resolve scope

Include only what the page uses:

- The page Vue file
- Shared shell pieces it mounts (`AppShell`, `SiteHeader`, `SiteFooter`, search, desk…)
- Rules in `match.css` (or feature CSS) that those classes hit

Do **not** restyle unrelated match-scoreboard chrome unless the user named that page.

### 2. Inventory

Grep target CSS/Vue for `padding`, `margin`, `gap`, `row-gap`, `column-gap`,
and arbitrary Tailwind spacing. Note raw `px` (except `1px` borders) and off-scale
`rem` (e.g. `0.35rem`, `2.25rem` when a neighbor step fits).

Group by **role**, not by selector:

| Role | Examples |
|------|----------|
| Page gutter | `--page-pad-x`, main horizontal pad |
| Section stack | search → desk → footer |
| Block stack | heading → list inside a section |
| Control pad | input/button padding, search-box |
| Inline gap | nav items, icon+label, row actions |
| List rhythm | saved/recent row padding and separators |

### 3. Map to scale

Use the scale in [references/scale.md](references/scale.md).

Rules:

- Same role → same value (or same token)
- Prefer existing tokens (`--page-pad-x`, `--page-max`) before inventing
- If 3+ call sites share a role, add a `:root` token (`--space-*` / `--space-section`)
- Snap to **0.25rem** steps; convert px → rem (16px = 1rem)
- Keep `1px` (and brand accent bar thickness) as borders, not spacing tokens

### 4. Apply

- Prefer CSS token + class changes over markup churn
- Do not change routing, store logic, copy, or colors “for spacing”
- Do not add marketing-sized hero voids
- Do not “fix” unrelated visual bugs unless blocking the spacing pass

### 5. Verify

- Desktop and ~560px / ~850px breakpoints already used in `match.css`
- `npm run typecheck` if Vue files changed
- Optional: quick browser glance that rhythm looks even

### 6. Report

Use this format:

```markdown
## Spacing pass: <target>

### Scope
- files…

### Role map
| Role | Before | After (token/value) |
|------|--------|---------------------|
| … | … | … |

### Diff summary
- …

### Checks
- [ ] desktop
- [ ] narrow
- [ ] typecheck (if needed)
```

## Anti-patterns

- New one-off values outside the scale
- Mixing `px` and `rem` for the same role
- Restyling the whole design system when asked for one page
- Huge section gaps that fight `DESIGN.md` scorebook density

## Examples

**User:** `spacing-system /`  
→ Scope `app/pages/index.vue`, `HomeDesk`, `MatchSearch`, header/footer rules in `match.css`.

**User:** `spacing-system app/pages/match/[id].vue`  
→ Scope match page + scoreboard/search chrome it uses; leave pure home-desk rules alone unless shared.
