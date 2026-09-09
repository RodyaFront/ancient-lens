# Ancient Lens — design system master

Source of truth for UI work in this repo: **`DESIGN.md` at the project root**.

This folder exists so ui-ux-pro-max hierarchical retrieval does not invent a
generic esports landing look. When building pages:

1. Read `DESIGN.md`
2. Read `pages/<page>.md` if present
3. Ignore purple / glass / marketing-hero suggestions that conflict with those files

## Tokens (implemented in `app/assets/css/match.css`)

| Token                           | Role                                               |
| ------------------------------- | -------------------------------------------------- |
| `--bg` / `--panel` / `--inset`  | Surfaces                                           |
| `--text` / `--muted` / `--line` | Type and rules                                     |
| `--accent` / `--on-accent`      | Brand + primary CTA                                |
| `--green` / `--red` / `--gold`  | Radiant / Dire / net worth                         |
| `--ranked`                      | Ranked lobby (ladder stakes); class `.tone-ranked` |
| `--party-1` … `--party-5`       | Party strip colors                                 |
| `--party-strip-width`           | Left-edge strip (`0.1875rem`)                      |
| `--display` / `--mono`          | Condensed headings + IDs                           |

## Stack

Nuxt 4 + Vue 3 + Tailwind v4 utilities where needed; match scorebook chrome is
hand-authored CSS in `match.css`.
