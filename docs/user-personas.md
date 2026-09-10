# Ancient Lens — user personas

Canon for **who we build for**. Product and UI decisions default to these people, not to the maintainers’ curiosity.

Related: [`DESIGN.md`](../DESIGN.md) (scorebook voice), [`.cursor/rules/user-personas.mdc`](../.cursor/rules/user-personas.mdc) (agent shortcut).

## Product promise (one line)

A **readable post-game scorebook** for a Dota 2 match: open a link or ID, see result, draft, party, contribution, economy, items — without becoming an analytics dashboard or a Dotabuff clone.

## Primary personas

### 1. Danylo — “just finished a game”

|                         |                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Who**                 | 18–28, plays ranked / Turbo several nights a week. EN or UK UI.                                                               |
| **Job**                 | Open the match he just played (Discord link, Dotabuff/OpenDota URL, or ID) and **understand what happened** in a few minutes. |
| **Cares about**         | Who won, the draft at a glance, his hero’s items and contribution, whether friends queued together.                           |
| **Does not care about** | API field names, sample sizes (`n=`), batch win rates, “lab” disclosures, how OpenDota aggregates publicMatches.              |
| **Mood**                | Post-game, slightly tilted or curious — low patience, high skim.                                                              |
| **Success**             | Scorebook opens fast; result and heroes are obvious; he can explain the game to a friend without decoding jargon.             |

**Design implication:** Prefer plain labels (“Avg Archon 2★”) over cryptic stats. List pages = browse recent games, not analyze a cohort.

---

### 2. Ira — “stack with friends”

|                         |                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who**                 | 22–35, queues 2–5 stack in evenings. Often Ukrainian-speaking; shares matches in Telegram/Discord.                                                |
| **Job**                 | After a stack game, show **who was with whom**, who carried, and what items defined the fight — without starting a flame war over opaque ratings. |
| **Cares about**         | Party marks, side-by-side Radiant/Dire, readable tables, shareable match URL, UK copy that doesn’t feel machine-translated.                       |
| **Does not care about** | Global ladder meta dashboards, facet analytics on the public feed, power-user filter grammars.                                                    |
| **Mood**                | Social review — “look at this game.”                                                                                                              |
| **Success**             | Party strips and contribution are honest and legible; the page works on a phone in a chat screenshot.                                             |

**Design implication:** Party and comparison UX beat batch tallies. Mobile and share clarity matter as much as desktop density.

---

### 3. Taras — “returning / learning reader”

|                         |                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Who**                 | 25–40, returns to Dota or plays casually; sometimes opens a guide (“how to read a match”) then a real match.                  |
| **Job**                 | Learn to **read a scorebook**: win, net worth, items, roles — without assuming Dotabuff muscle memory.                        |
| **Cares about**         | Clear section hierarchy, plain language, provenance (“data from OpenDota”), guides that match what he sees on the match page. |
| **Does not care about** | Parity with every Dotabuff widget; inventing “insights” or fantasy ratings.                                                   |
| **Mood**                | Curious, not expert.                                                                                                          |
| **Success**             | He can follow the match page top-to-bottom and answer “who won and why it looks that way” from real fields only.              |

**Design implication:** Progressive clarity > feature checklist. Missing data = em dash, never invent. Guides and match UI stay in one vocabulary.

---

## Secondary (serve lightly)

### 4. Olena — “content / coach-lite”

Occasionally clips or reviews a public match for a small audience. Wants a clean scorebook frame and honest numbers. **Not** our primary roadmap driver — do not add analyst workflows, export theaters, or cohort tools for her alone.

## Anti-persona (do not optimize for)

### “Batch analyst”

Wants winrate bars over the last 40 public matches, API schema tours, dense filter grammars, and metric definitions on every list page. Ancient Lens **is not** that product. Put depth on the **single-match** scorebook; keep discovery lists scannable and jargon-free.

## Decision checklist

Before shipping UI or copy, ask:

1. Would **Danylo** understand this label in three seconds after a ranked game?
2. Does this help **Ira** show a stack game on a phone?
3. Would **Taras** need a glossary to use it?
4. Are we serving the **anti-persona** at the expense of the three above?

If (4) is yes and (1)–(3) are weak — cut it or bury it (e.g. tooltip / About), don’t put it in the primary chrome.
