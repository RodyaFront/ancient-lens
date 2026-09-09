# Item hover — visual pattern analysis

**Purpose:** Extract reusable **information architecture** and **content systems** from item tooltips.

**Not a UI reference for Ancient Lens.** Do not copy Valve chrome, colors, fonts, glow, shop glyphs, or recipe art. Ancient Lens follows `DESIGN.md` (scorebook). This file is about _what content blocks exist_, _when they appear_, and _how emphasis works_ — so the OpenDota/constants dictionary can be mapped cleanly.

## Sources (two surfaces)

| Surface                        | Examples                                             | What it is                                     |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------- |
| **A. Encyclopedia / web card** | Guardian Greaves, Octarine Core, Spirit Vessel (EN)  | Dense card: notes + **recipe tree** on default |
| **B. In-game client tooltip**  | Pipe of Insight, Blade Mail, Linken's Sphere (RU UI) | Default hover: compressed; **ALT** for “more”  |

Treat **B as the primary IA for match-page hover** (scan while reading a scoreboard). Treat **A** as the expanded encyclopedia set (notes + components). Do not merge them into one always-on card.

---

## 1. Shared systems (A + B)

### 1.1 Vertical module stack

Fixed-width, variable-height column. Height grows by **adding/omitting modules**, not redesigning layout.

### 1.2 Identity

- Square **icon** (left) + **name** (right, display weight; client often all-caps English name even in RU UI).
- **Cost** = gold token + number (currency signal — map to AL `--gold`, not client yellow).
- Optional shop/base glyph next to cost — optional for scorebook.

### 1.3 Targeting / class meta

Classification lines, not prose:

- Type / ability class — EN: `ABILITY: …`; RU client: `ТИП: …`
- Optional affects — EN: `AFFECTS: …`; RU: `ДЕЙСТВУЕТ: …`

Hairline or bar separates meta from the stat list.

### 1.4 Stat bonus list

```text
+ {value}{optional unit} {stat label}
```

- Value (and `%`) = primary emphasis; label = muted.
- RU client localizes labels (`к броне`, `к восстановлению маны`, …); values stay Arabic numerals.
- Leading `+` is part of the pattern.

### 1.5 Ability panels (Active / Passive)

Each ability is a **self-contained panel**:

1. **Header:** `{Active|Passive|Активное|Пассивное}: {AbilityName}`
2. **Resource chips** (header-right, when present): icon + number — cast range / radius, mana, cooldown (0–3 chips observed)
3. **Body:** prose with **inline numeric emphasis**
4. **Key-value footers** when present (`Radius` / `Радиус`, dispel type, …) — label muted, value emphasized

Semantic split:

- **Active** = player-triggered
- **Passive** = always-on / aura / triggered-without-cast
- Stat-only bonuses (e.g. Octarine CDR) live in the **stat list**, not a named passive panel

**Ability name can repeat** on Active and Passive (Blade Mail: both `Damage Return`). Key by kind + name, not name alone.

**Panel order is data-driven, not fixed Active→Passive.** Linken's Sphere shows **Passive then Active**. Compose in the order the dictionary/game exposes abilities.

### 1.6 Inline numeric emphasis

Every gameplay number in bodies/notes is emphasized; surrounding words stay secondary. Descriptions need marked values (HTML / tokens / number wrapper) — plain gray walls lose the scan pattern.

### 1.7 Lore vs notes

| Kind  | Tone                   | Gameplay? |
| ----- | ---------------------- | --------- |
| Notes | Rules, stacking, edges | Yes       |
| Lore  | Flavor (often italic)  | No        |

Never merge notes into lore.

---

## 2. Surface A — encyclopedia / web default

**Default stack (max):**

1. Identity
2. Targeting meta
3. Stat list
4. Active panel(s)
5. Passive panel(s)
6. Mechanical notes (sibling panels and/or nested under Active)
7. Lore
8. **Recipe tree** (parent → direct components, including recipe scroll)

Examples:

- **Octarine** — minimal: identity → meta → stats → lore → recipe
- **Greaves** — dense: + active + passive + notes + lore + recipe
- **Spirit Vessel** — active with **nested** notes inside the active panel

Notes and recipe are **first-class on default** here (no ALT gate in these captures).

---

## 3. Surface B — in-game client default (RU captures)

**Default stack (observed):**

1. Identity (+ optional shop glyph)
2. Targeting meta (`ТИП` / `ДЕЙСТВУЕТ`)
3. Stat list (localized labels)
4. Ability panels in **game order** (Active and/or Passive; chips on Active and sometimes Passive)
5. Lore
6. **Footer affordance:** `Подробнее` + **ALT** key chip

**Not on default B (in these shots):**

- Recipe / build tree
- Extra mechanical note panels (stacking callouts, etc.)

Those belong behind **progressive disclosure** (ALT / “more details”), or on surface A.

### 3.1 Progressive disclosure system

Default hover = **play-critical scan** (what it does, costs, numbers).  
ALT / “Подробнее” = **encyclopedia depth** (notes, components, extras).

For Ancient Lens match hover: prefer **B-depth by default**; optional expand or click-through for A-depth — do not dump recipe+notes into every scoreboard hover.

### 3.2 Localization split (RU client)

| Element           | Language in captures   |
| ----------------- | ---------------------- |
| Item display name | English caps           |
| Ability names     | English (`Barrier`, …) |
| UI labels / stats | Russian                |
| Lore              | Russian                |
| Footer            | Russian + ALT          |

Scorebook implication: i18n wraps **chrome labels**; item/ability strings follow whatever the dictionary locale provides (OpenDota dumps are usually EN).

### 3.3 Resource chip set (B)

Observed chip roles on ability headers:

- Range / radius (green-style mark)
- Mana cost (blue mark)
- Cooldown (clock / split mark)

Pipe Active shows **three** chips (1200 / 150 / 60). Passiveives can carry range + CD without mana (Linken's Spellblock: 700 / 14).

---

## 4. Conditional composition

```text
# Default match hover (surface B depth)
show identity
if type or affects → targeting meta
if attrib.length → stat list
for each ability in source order:
  show panel (kind + name + chips + body + k/v)
if lore → lore
# optional: “more” affordance → surface A extras

# Expanded / encyclopedia (surface A extras)
if notes → note panels (or nested)
if components → recipe tree
```

Empty modules collapse; never reserve empty Active/Passive slots.

---

## 5. Content → data field map

| UI module        | Typical constants fields                          |
| ---------------- | ------------------------------------------------- |
| Name / icon      | `dname`, `img`                                    |
| Cost             | `cost`                                            |
| Targeting meta   | behavior / type / target team fields              |
| Stat list        | `attrib`                                          |
| Active / Passive | structured abilities / `hint`, `cd`, `mc`, …      |
| Notes            | `notes` (default A; expanded B)                   |
| Lore             | `lore`                                            |
| Recipe           | `components` + recipe ids (default A; expanded B) |

Match payload supplies **item id** only; hover fills from the static dictionary.

---

## 6. Explicit non-goals for Ancient Lens

- Do not clone client art (purple active wash, gold shop chrome, ALT keycap styling).
- Do not require Valve mana/CD glyphs if Lucide + tokens suffice.
- Do not put recipe trees on every scoreboard hover by default.
- Pixel-parity with screenshots is out of scope; **module parity + numeric emphasis + B-then-A disclosure** is the useful extract.
