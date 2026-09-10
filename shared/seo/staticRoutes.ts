/**
 * Prerendered / SPA-shell document paths (no trailing slash except `/`).
 * Keep Worker `isKnownSpaShellPath` in sync with this list + hero/match patterns.
 */
export const SEO_STATIC_DOCUMENT_PATHS = [
  '/',
  '/uk',
  '/about',
  '/uk/about',
  '/guides/how-to-read-a-dota-2-match',
  '/uk/guides/how-to-read-a-dota-2-match',
  '/guides/dota-2-match-stats',
  '/uk/guides/dota-2-match-stats',
  '/compare/opendota',
  '/uk/compare/opendota',
  '/compare/dotabuff',
  '/uk/compare/dotabuff',
  '/heroes',
  '/uk/heroes',
  '/matches',
  '/uk/matches',
  '/saved',
  '/uk/saved',
] as const

export type SeoStaticDocumentPath = (typeof SEO_STATIC_DOCUMENT_PATHS)[number]

/** Example match IDs linked from guides (public, stable for demos). */
export const SEO_EXAMPLE_MATCH_IDS = ['8990366825', '8961419173'] as const

/** Cap public-match URLs baked into the sitemap at generate time. */
export const SEO_SITEMAP_MATCH_LIMIT = 500
