import { OPENDOTA_API } from '#shared/match/constants'
import {
  isUsablePublicMatch,
  type PublicMatchSummary,
} from '#shared/match/publicMatches'

/** Fresh list TTL (dev / Node). Aligns with Worker edge cache (~5 min). */
const CACHE_MS = 300_000
/** Serve last-good for up to an hour when OpenDota 429s. */
const LAST_GOOD_MS = 3_600_000
/** Skip upstream briefly after a hard miss so refresh storms cool down. */
const COOLDOWN_MS = 30_000
const LIMIT = 40

type CacheEntry = {
  at: number
  rows: PublicMatchSummary[]
}

let memoryCache: CacheEntry | null = null
let cooldownUntil = 0
let inflight: Promise<PublicMatchSummary[]> | null = null

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

function isFresh(entry: CacheEntry, now: number): boolean {
  return now - entry.at < CACHE_MS
}

function isUsableStale(entry: CacheEntry, now: number): boolean {
  return now - entry.at < LAST_GOOD_MS
}

export default defineEventHandler(async (event) => {
  const now = Date.now()
  if (memoryCache && isFresh(memoryCache, now)) {
    setResponseHeader(event, 'Cache-Control', 'public, max-age=60')
    setResponseHeader(event, 'X-Public-Matches-Cache', 'HIT')
    return memoryCache.rows
  }

  if (now < cooldownUntil && memoryCache && isUsableStale(memoryCache, now)) {
    setResponseHeader(event, 'Cache-Control', 'public, max-age=30')
    setResponseHeader(event, 'X-Public-Matches-Cache', 'STALE')
    return memoryCache.rows
  }

  if (now < cooldownUntil && !memoryCache) {
    throw createError({
      statusCode: 429,
      statusMessage: 'OpenDota rate limit',
    })
  }

  try {
    if (!inflight) {
      inflight = fetchPublicMatches().finally(() => {
        inflight = null
      })
    }
    const rows = await inflight
    memoryCache = { at: Date.now(), rows }
    cooldownUntil = 0
    setResponseHeader(event, 'Cache-Control', 'public, max-age=60')
    setResponseHeader(event, 'X-Public-Matches-Cache', 'MISS')
    return rows
  } catch (error: unknown) {
    cooldownUntil = Date.now() + COOLDOWN_MS

    if (memoryCache && isUsableStale(memoryCache, Date.now())) {
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
