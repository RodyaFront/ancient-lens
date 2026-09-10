import { heroSlug, HEROES_BY_ID, listHeroesSorted } from '#shared/match'
import { OPENDOTA_API } from '#shared/match/constants'
import {
  SEO_EXAMPLE_MATCH_IDS,
  SEO_SITEMAP_MATCH_LIMIT,
} from '#shared/seo/staticRoutes'

type PublicMatchRow = { match_id?: number }

export default defineSitemapEventHandler(async () => {
  const urls: Array<{ loc: string }> = []

  for (const entry of listHeroesSorted(HEROES_BY_ID)) {
    const slug = heroSlug(entry)
    urls.push({ loc: `/heroes/${slug}` }, { loc: `/uk/heroes/${slug}` })
  }

  const matchIds = new Set<string>([...SEO_EXAMPLE_MATCH_IDS])
  try {
    const list = await $fetch<PublicMatchRow[]>(
      `${OPENDOTA_API}/publicMatches`,
      {
        timeout: 8_000,
      },
    )
    if (Array.isArray(list)) {
      for (const row of list.slice(0, SEO_SITEMAP_MATCH_LIMIT)) {
        if (typeof row.match_id === 'number' && Number.isFinite(row.match_id)) {
          matchIds.add(String(row.match_id))
        }
      }
    }
  } catch {
    // Generate still succeeds with example match IDs only.
  }

  for (const id of matchIds) {
    urls.push({ loc: `/match/${id}` }, { loc: `/uk/match/${id}` })
  }

  return urls
})
