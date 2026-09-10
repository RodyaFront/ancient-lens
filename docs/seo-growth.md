# Category SEO growth

Roadmap for ranking on **category** queries (`dota 2 match stats`, `розбір матчу дота`, …) and long-tail **alternatives** (`Ancient Lens vs OpenDota`). We do **not** try to displace brand SERPs for `dotabuff` / `opendota`. Domain stays `https://ancientlens.info`.

## Phase 0 checklist (ops)

- [ ] Cloudflare Redirect Rule: `www.ancientlens.info/*` → `https://ancientlens.info/${1}` (301). See [deploy.md](./deploy.md).
- [ ] Google Search Console property `https://ancientlens.info`.
- [ ] Submit `https://ancientlens.info/sitemap_index.xml`.
- [ ] URL Inspection: `/`, `/guides/dota-2-match-stats`, `/uk/guides/how-to-read-a-dota-2-match`, one `/match/{id}`.
- [ ] Workers Builds + CI env: `NUXT_PUBLIC_SITE_URL` and `NUXT_SITE_URL` = `https://ancientlens.info` only.

## Indexable hubs (shipped in app)

| Path                                               | Intent                      |
| -------------------------------------------------- | --------------------------- |
| `/guides/how-to-read-a-dota-2-match` (+ `/uk/...`) | how to read / розбір матчу  |
| `/guides/dota-2-match-stats`                       | match stats category        |
| `/compare/opendota`, `/compare/dotabuff`           | alternative / vs long-tail  |
| `/heroes`, `/heroes/{slug}`                        | hero long-tail              |
| `/matches`                                         | discovery of public matches |
| `/about`                                           | provenance + brand          |

Match URLs stay Worker-enriched; sitemap includes example IDs plus up to 500 public match IDs at generate time (`server/api/__sitemap__/urls.ts`).

## Distribution (Phase 4)

- Share guide URLs in UA/EN communities (Discord / Reddit / TG) with scorebook USP — party, MVP, contribution.
- Prefer links to guides and `/about`, not only raw match IDs.
- Do not buy link spam; keep www→apex and canonical hygiene.

## Monthly GSC iteration (Phase 5)

Once per month:

1. **Queries** — note category phrases that already show impressions; extend FAQ / section copy on the matching hub.
2. **Pages** — impressions without clicks → rewrite title/description for CTR (still scorebook voice).
3. **Indexing** — soft-404 / excluded match URLs → trim sitemap noise; keep example IDs.
4. **Compare pages** — watch “alternative to …” queries; do not chase pure `dotabuff` / `opendota` brand clicks.

### Success signals (12 months)

1. Stable impressions on match-stats / розбір clusters.
2. Clicks on Ancient Lens brand + guide URLs.
3. Compare URLs appear for alternative phrasing, not competitor brand navigation.
