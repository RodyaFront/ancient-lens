# Dotabuff → Ancient Lens parity backlog

**Canonical progress list for match-page features inspired by Dotabuff.**

- Inventory source: [`docs/dotabuff-match-8989689202-features.md`](./dotabuff-match-8989689202-features.md)
- Reference match: https://www.dotabuff.com/matches/8989689202
- Product: Ancient Lens (Nuxt scorebook) — adapt, do not clone Dotabuff chrome/Plus/ads

## How agents should use this file

When the user asks to continue Dotabuff parity / match functionality progress:

1. Read **this file** and update checkbox statuses as work lands
2. Prefer items marked `P0` / `P1` unless the user scopes otherwise
3. Keep EN/UK i18n for every new UI string
4. Reuse `AppTooltip` / existing match components; do not shift scoreboard grid with padding for badges

**Trigger phrases (user → agent):** see “How to resume” at the bottom of this file.

---

## Status legend

- `[ ]` not started
- `[~]` in progress / partial
- `[x]` done for Ancient Lens (good enough; not pixel-parity)

---

## Already in Ancient Lens (baseline)

- [x] Match route + OpenDota fetch / snapshot
- [x] Score header (result, duration, meta chips, save/refresh/export)
- [x] Scoreboard Radiant/Dire with K/D/A, NET, GPM, LH/DN, damage, items
- [x] Overview / Economy / Combat column views + team filter + sort
- [x] Player / item dialogs (basic)
- [x] Insights (team comparison)
- [x] i18n EN default + UK
- [x] `AppTooltip` + best-in-match star on scoreboard leaders (`MatchBestStat`)

---

## P0 — Hover / tooltip layer (Dotabuff §0)

Highest product gap vs Dotabuff: encyclopedia detail lives on hover.

- [x] **Item hover card** — name, cost, stats, active/passive, lore (from OpenDota/item dictionary + CDN); armed hover (150ms + 300ms cursor ring = 450ms); click pins tip (sticky, Esc/outside/toggle); enter/leave rise motion; no item modal. Surface B depth. Content modules: [`docs/item-hover-patterns.md`](./item-hover-patterns.md). Notes/recipe (surface A) still open.
- [x] **Hero portrait hover** — scorebook tip (not Dotabuff clone): portrait, name, primary attr glyphs, STR/AGI/INT + gain, MS/armor, roles, match level; pub meta when `/heroStats` loads. Same armed hover / pin / Esc as items.
- [x] **Scoreboard header tooltips** — plain-language definitions for K/D/A, NET, LH/DN, GPM, XPM, DMG, HEAL, BLD, Items (i18n)
- [ ] **Ability hover card** (needed once builds exist) — name, hotkey, description, key numbers
- [ ] **Talent tree hover** (needed once builds exist) — 10/15/20/25 board, taken options highlighted

---

## P1 — Match structure parity (Dotabuff §2–5, §7–9)

- [ ] **Draft strip** — ordered picks/bans with PICK/BAN markers + hero icons
- [ ] **Team totals row** on scoreboard (aggregate K/D/A, NET, farm, damage…)
- [ ] **Ability builds preview** on match page (skill order 1–25 + talents)
- [ ] **Build Details** surface (tab or section) — per-player ability timeline
- [ ] **Team advantage chart** — XP (and Gold when data exists) over time; toggle Team Adv / Per Minute if data allows
- [ ] **Towers & barracks** map / structure status
- [ ] **Parse-state messaging** — when OpenDota lacks parsed extras, show clear “limited stats” notice (like Dotabuff Analyzing / extra stats missing)

---

## P2 — Deeper parse extras (Dotabuff §6, §13)

Only when OpenDota payload supports it:

- [ ] Item purchase timings timeline
- [ ] Kill participation / kill matrix or player kill counts beyond basics
- [ ] Additional series on advantage chart (Gold, etc.)
- [ ] Ward / vision extras if we ever expose them (out of scope until data + design)

---

## P3 — Explicitly out of scope / low priority

Do **not** treat as Ancient Lens parity goals unless product direction changes:

- [ ] Dotabuff site chrome (Esports hub, Forums, Plus paywall, ads)
- [ ] Steam Sign-In / match comments
- [ ] Live Matches browser / event modes (Siltbreaker, Dark Moon)
- [ ] Dotabuff catalog deep-links as primary UX (OpenDota / first-party data preferred)
- [ ] Rank medals / full player profiles network (optional later)

---

## Suggested implementation order

1. ~~Header column tooltips~~ (done)
2. ~~Item hover cards on `MatchItemSlot`~~ (surface B done; A notes/recipe later)
3. Hero portrait hover ← **next**
4. Draft strip
5. Team totals row
6. Advantage chart (XP/Gold from OpenDota)
7. Towers & barracks
8. Ability builds + ability/talent tooltips
9. Parse-limited extras when data exists
10. Item hover surface A (notes + recipe tree / expand)

---

## Progress log

| Date       | Note                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-09 | Inventory captured; backlog created                                                                                                                                                                                                                                         |
| 2026-09-09 | Best-stat badge + tooltip on value+star shipped                                                                                                                                                                                                                             |
| 2026-09-09 | Item hover patterns: split surface A (web/encyclopedia) vs B (in-game + ALT) in `docs/item-hover-patterns.md`                                                                                                                                                               |
| 2026-09-09 | Item hover card (surface B) + armed cursor ring; `npm run sync:items` enriches `public/data/items.json`                                                                                                                                                                     |
| 2026-09-09 | **Migrated (Dotabuff P0):** item hover pin + rise motion (`ui-rise` / `AppFloatRoot`); header tooltips already done. **AL polish (not Dotabuff):** score whoosh + ambient fire (scroll/HRTF/mute); embers hearth; linear coal fade; removed Replay + OpenDota topline label |
| 2026-09-09 | **Layer 1 shipped:** hero catalog (`sync:heroes`, `buildHeroProfile`, meta via `/heroStats`). **Layer 2 UI removed** for redesign (no Dotabuff visual clone).                                                                                                               |
| 2026-09-09 | **Hero portrait hover (Layer 2):** scorebook tip + attr icons; pin/armed hover parity with items; meta fail-soft via `useHeroMeta`.                                                                                                                                         |

Update this table when a chunk of work merges or is clearly done.
