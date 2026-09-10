import { OPENDOTA_API } from '#shared/match/constants'
import {
  isUsablePublicMatch,
  type PublicMatchSummary,
} from '#shared/match/publicMatches'

const CACHE_MS = 90_000
const LIMIT = 40

type CacheEntry = {
  at: number
  rows: PublicMatchSummary[]
}

let memoryCache: CacheEntry | null = null

async function fetchPublicMatches(): Promise<PublicMatchSummary[]> {
  const list = await $fetch<PublicMatchSummary[]>(
    `${OPENDOTA_API}/publicMatches`,
    { timeout: 10_000 },
  )
  if (!Array.isArray(list)) {
    return []
  }
  return list.filter(isUsablePublicMatch).slice(0, LIMIT)
}

export default defineEventHandler(async (event) => {
  const now = Date.now()
  if (memoryCache && now - memoryCache.at < CACHE_MS) {
    setResponseHeader(event, 'Cache-Control', 'public, max-age=60')
    setResponseHeader(event, 'X-Public-Matches-Cache', 'HIT')
    return memoryCache.rows
  }

  try {
    const rows = await fetchPublicMatches()
    memoryCache = { at: now, rows }
    setResponseHeader(event, 'Cache-Control', 'public, max-age=60')
    setResponseHeader(event, 'X-Public-Matches-Cache', 'MISS')
    return rows
  } catch (error: unknown) {
    if (memoryCache) {
      setResponseHeader(event, 'Cache-Control', 'public, max-age=30')
      setResponseHeader(event, 'X-Public-Matches-Cache', 'STALE')
      return memoryCache.rows
    }

    const status =
      typeof error === 'object' &&
      error &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : typeof error === 'object' &&
            error &&
            'status' in error &&
            typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : 502

    throw createError({
      statusCode: status === 429 ? 429 : 502,
      statusMessage:
        status === 429
          ? 'OpenDota rate limit'
          : 'Failed to load public matches',
    })
  }
})
