# Dotabuff match page — functional inventory

Source: [https://www.dotabuff.com/matches/8989689202](https://www.dotabuff.com/matches/8989689202)  
Captured: 2026-09-09 (static UI pass + Playwright hover pass)  
Match: `8989689202` (Radiant victory, 64–36, 38:04, Ranked All Pick, Europe)

This note lists **functionality present on this Dotabuff match page** (Overview + Build Details), as observed in the live UI — including **hover / tooltip surfaces**, which carry a large share of the product detail. Some deeper parse features are gated or unavailable while the match is still **Analyzing**.

---

## 0. Hover / tooltip layer (verified)

Dotabuff keeps most catalog detail off the static layout and reveals it on hover. On this Overview page Playwright counted **~243** hover-trigger nodes with `data-state="closed"`:

| Kind      | Approx. count | Trigger                              |
| --------- | ------------- | ------------------------------------ |
| Abilities | ~154          | Skill icons / QWER cells in builds   |
| Items     | ~79           | Inventory / backpack / neutral icons |
| Heroes    | ~10           | Scoreboard hero portraits            |

Tooltips use Dotabuff’s floating cards (item/ability panels) and classic `.ui-tooltip` bubbles (column labels, talent trees).

### Verified hover content on this match

**Items** (example: Lotus Orb, Daedalus)

- Item name + gold cost
- Ability type (Unit Target / Passive / …) and target rules
- Stat bonuses (+armor, regen, damage, …)
- Active / passive ability block (name, values, cooldown/mana/range when present)
- Notes / dispel type / lore line
- Click-through still goes to `/items/{slug}`

**Heroes** (scoreboard portraits)

- Compact card: hero name + **Level N**
- Click-through to `/heroes/{slug}`

**Abilities** (build grid / ability icons)

- Full ability tooltip: name, hotkey (Q/W/E/R/…)
- Ability metadata (Unit Target, affects, debuff immunity, dispellable)
- Description + numeric values (distances, %, cooldowns, mana, cast range)
- Flavor text
- Links toward `/heroes/{slug}/abilities`

**Talent tree** (talent cell / “Talent Tree…” control)

- `.ui-tooltip` talent board:
  - Left/right options at levels **10 / 15 / 20 / 25**
  - Taken talents readable in the tree layout
- Link toward `/heroes/{slug}/skills`

**Scoreboard column headers** (`.ui-tooltip`)

Captured examples:

- **GPM** → “Gold earned per minute”
- **DMG** → “Damage dealt to enemy Heroes”

(Same pattern applies to other abbreviated headers: K/D/A, NET, LH/DN, XPM, HEAL, BLD, Items — short plain-language definitions.)

**Native `title=` attributes**

Almost unused on match chrome (only incidental ones like absolute match-ended timestamp on `<time>`). Product hover UX is custom tooltips, not browser titles.

### Hover UX notes for Ancient Lens

- Hover is the primary way Dotabuff exposes item/ability encyclopedia content without leaving the match.
- Inventory icons alone are not enough: users expect name, cost, stats, and actives on hover.
- Ability build cells are not just letters: hover carries the full skill text for that pick.
- Talent hover is a mini talent tree, not a single string.
- Column abbreviations need header tooltips (or visible full labels) for newcomers.

---

## 1. Site chrome (around the match)

- Global nav: Esports, Heroes, Items, Players, Matches, Blog, Forums, Plus
- Search / profile area, **Sign In** (Steam)
- Matches sub-nav: Live Matches, Recent Esports Matches, Recent Matches, event modes (Siltbreaker, Dark Moon)
- Promo cross-link (Deadlock / Statlocker)
- Footer: language switcher (many locales), About / Betting / FAQ / Support / Privacy, sister products
- Dotabuff **Plus** upsell (ads-free / paid features)

---

## 2. Match header / metadata

- Match ID in title (`Match 8989689202`)
- Page mode label (`Overview` / `Builds`)
- Meta chips:
  - Lobby type (Ranked)
  - Game mode (All Pick)
  - Region (Europe)
  - Duration (38:04)
  - Match ended (relative time)
- Comments counter link (`0 Comments`)
- Result banner: **Radiant Victory**, kill score Radiant/Dire, duration between scores
- Parse status badge: **Analyzing** → links to Dotabuff Truesight (`/truesight`)

---

## 3. Match page tabs

| Tab           | URL                    | Role                                             |
| ------------- | ---------------------- | ------------------------------------------------ |
| Overview      | `/matches/{id}`        | Main scorebook + draft + graphs + builds preview |
| Build Details | `/matches/{id}/builds` | Full ability / talent builds per player          |

On this match, Overview also shows an **Analyzing** entry (parse not finished).

---

## 4. Team scoreboards (Radiant & Dire)

Two team blocks: **The Radiant** / **The Dire**.

### Per-player row

- Hero portrait + level
- Player identity: name or **Anonymous**, profile link when public, rank medal when available
- Combat / economy columns:
  - **K / D / A** — kills, deaths, assists
  - **NET** — net worth
  - **LH / DN** — last hits / denies
  - **GPM / XPM** — gold / XP per minute
  - **DMG** — hero damage
  - **HEAL** — hero healing
  - **BLD** — building damage
- **Items** strip: inventory icons (main slots + backpack / neutral as shown); **hover → full item card** (see §0)
- Hero portrait **hover → name + level**; ability/talent cells **hover → ability / talent tree cards**
- Column abbreviations **hover → definition tooltips** (e.g. GPM, DMG)

### Team totals row

Aggregates for K/D/A, NET, LH/DN, GPM/XPM, DMG, HEAL, BLD.

### Responsive column groups (tablet / narrow)

Scoreboard header tabs regroup columns:

| Group    | Columns emphasized |
| -------- | ------------------ |
| Overview | K, D, A, NET       |
| Farm     | LH, DN, GPM, XPM   |
| Damage   | DMG, HEAL, BLD     |
| Items    | Items strip        |

---

## 5. Draft (picks & bans)

Under each team table (and overall draft strip):

- Ordered pick/ban sequence with step numbers
- **PICK** vs **BAN** markers
- Hero icons for drafted / banned heroes

---

## 6. Parse-dependent “extra stats” (unavailable here)

Notice on this match:

> Extra stats (item timings, player kill counts, etc) are not available for this match.

Implied Dotabuff features that normally appear after full analysis (not populated on this page yet):

- Item purchase timings
- Player kill counts / related combat breakdowns
- Other parse-heavy extras

---

## 7. Team Advantages chart

Section: **TEAM ADVANTAGES** / **PER MINUTE**

Observed on this page:

- Chart type toggle area (Team Advantages vs Per Minute framing)
- Metric tab: **Experience** (active)
- Time axis markers (05:00 … 35:00)
- Value axis (e.g. −10k … 40k)
- SVG chart rendering

Gold / other series may appear when more metrics are offered for fully parsed matches; here **Experience** is the visible series control.

---

## 8. Towers and Barracks

Section: **TOWERS AND BARRACKS**

- Visual map / structure status for Radiant vs Dire buildings (towers, barracks)
- Complements the kill score with objective state

---

## 9. Ability builds (Overview preview + Build Details)

### On Overview

- **Radiant Builds** / **Dire Builds** tables
- Skill order grid by level **1–25**
- Ability keys **Q / W / E / R** (and hero-specific keys e.g. Invoker **D / F**)
- Talent picks highlighted by level
- **Hover:** talent tree tooltip (full 10/15/20/25 board); ability icons show full skill tooltips
- **MORE** → jumps to Build Details

### On Build Details (`/builds`)

- Per-player build cards: hero, side, level, player name
- Ability leveling timeline by key
- Talent levels taken
- Some interactions / expansions appear behind **Dotabuff Plus** (“This feature is only available to Dotabuff Plus members”)

---

## 10. Comments

- Comments section at bottom of Overview / Builds
- Count in header (`0 Comments`)
- Posting requires **Sign in with Steam** (“Please sign in to post comments.”)

---

## 11. Deep links from the match UI

- Player profile links (public names)
- Hero / item icon links into Dotabuff catalogs
- Ability / talent detail links
- Match tab links (Overview ↔ Builds)
- Analyzing → Truesight info page
- Locale mirrors (`ru.dotabuff.com`, `uk.dotabuff.com`, …) for the same match ID

---

## 12. Auth / monetization surface on this page

- Steam Sign In (profile, comments)
- Dotabuff Plus paywall copy on Builds (and site-wide Plus nav)
- Ads for non-Plus users (Plus claims ad-free)

---

## 13. What this specific match does _not_ fully show (yet)

Because status is **Analyzing** / extra stats missing:

- Item timing timeline
- Detailed kill matrices / player kill counts
- Possibly additional charts / log-style views that Dotabuff exposes on fully parsed matches

Treat those as **known Dotabuff match-page capabilities that are deferred**, not as present content on `8989689202` at capture time.

---

## Quick map (Overview top → bottom)

1. Global + Matches navigation
2. Match metadata + result + tabs
3. Radiant scoreboard + draft picks (**+ item/hero/header hovers**)
4. Dire scoreboard + draft picks
5. “Extra stats unavailable” notice
6. Team Advantages / Experience chart
7. Towers and Barracks
8. Radiant / Dire ability builds preview (**+ ability/talent hovers**)
9. Comments (Steam gate)
10. Footer / languages / Plus

---

## Method note

- First pass used accessibility snapshot + DOM text (missed most hover-only UI).
- Hover pass used headless Playwright real `hover()` on Overview triggers and captured floating item/ability panels plus `.ui-tooltip` content.
- Raw probe dump (local only): `.tmp-browser/hover-results.json`
