# Ancient Lens design direction

A Dota match review should feel like a tournament scorebook: immediate results,
recognizable heroes, legible statistics, and deliberate typography. It is a working
surface for players, not an analytics product landing page.

## Decisions

| Previous pattern                                                         | Replacement                                                                       | Purpose                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Large, mostly empty sidebar, breadcrumbs, mock profile                   | Compact masthead with the three existing navigation actions                       | Give match data the available width; keep navigation accessible on phones |
| Marketing headline, sparkle icon, motivational copy                      | Literal match heading and a visible input label                                   | Let people open a match immediately                                       |
| Rounded panels, pastel accents, gradient scoreboard, decorative rings    | Flat dark surfaces, square edges, restrained separators                           | Give this tool the character of a competitive game statistics page        |
| Generic shield/flame emblems                                             | The actual five hero portraits from each team                                     | Make the match identifiable from its draft                                |
| Tiny type, visual emphasis weighted toward Radiant regardless of outcome | 16px base text, condensed display type, tabular figures, equal-weight comparisons | Keep both teams easy to read and compare                                  |
| Three detached summary cards and repeated icons                          | A continuous statistics section with shared rules                                 | Group related results without making every number a separate widget       |
| Floating accent dots and badges claiming private access                  | Plain source provenance and explicit win/loss labels                              | Use visual state only for facts the application knows                     |

## System

- IBM Plex Sans for interface text; Roboto Condensed for the wordmark, headings,
  score and large statistics; system monospace for IDs and table values.
- Charcoal background, neutral text and vermilion for brand and the primary action.
  Green/red encode Radiant/Dire; gold identifies net worth; amber `--ranked` marks
  Ranked (competitive ladder) lobby — reuse `.tone-ranked` / `data-tone="ranked"`,
  do not overload gold or accent for that meaning. Multi-player queue groups use a
  left-edge party color strip (`--party-strip-width`, `--party-1`…`--party-5`).
  Item hover encyclopedia cues (flat, no glow): `--item-active` (lilac) /
  `--item-passive` (cool blue-grey) for ability panels; `--item-mana` / `--item-cooldown`
  for resource chips; gold remains shop cost/NW only. Neutral tiers 1–5 use
  `--item-tier-1`…`--item-tier-5` on the tier label (and a light identity wash).
  Outcome always has a text label as well as color.
- Lengths in CSS/UI: prefer `rem` and `--space-*` (see `.cursor/rules/units-rem.mdc`).
  Avoid new `px` except 1px hairlines.
- No decorative gradients, glows, faux glass, AI sparkles or ornamental status dots.
  The spinner, team comparison bars, neutral item circles and hero images all have
  specific information or interaction roles.
- Use 14px for regular controls and table data, 16px for body copy, and 12px only
  for secondary metadata. Never shrink the whole interface to make a table fit.
- Keep the player column visible during horizontal table scrolling. Reflow search,
  navigation, team summaries and dialogs for small screens. Respect reduced motion
  and retain visible keyboard focus, native dialog behavior and arrow-key tabs.
- Keep the Ukrainian interface and existing match, filter, sort, bookmark, export,
  source and detail flows. Use data from the existing OpenDota pipeline; do not add
  invented insights, performance claims or a decorative MVP score.
- Match open ritual: scorebook-shaped loading skeleton + stage copy
  (resolve → fetch → build); climax remains the score card reveal / VFX — do not
  add a second full-page analyze spectacle or artificial post-fetch delay.
- Home and match share one search chrome (padding, border, heading, blurb). Drive
  page differences with `main.page-home` / `main.page-match` from the route — not
  `:has(.result-region)`, which jumps when results mount.

Future edits should follow this direction rather than adding generic dashboard
chrome or changing only the accent color.
