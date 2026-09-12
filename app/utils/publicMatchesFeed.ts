import { OPENDOTA_API } from '#shared/match/constants'
import {
  isUsablePublicMatch,
  type PublicMatchSummary,
} from '#shared/match/publicMatches'

const PROXY_PATH = '/api/public-matches'
const LIMIT = 40

function statusFromFetchError(err: unknown): number {
  if (typeof err !== 'object' || !err) {
    return 0
  }
  if (
    'statusCode' in err &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (err as { statusCode: number }).statusCode
  }
  if (
    'status' in err &&
    typeof (err as { status?: unknown }).status === 'number'
  ) {
    return (err as { status: number }).status
  }
  return 0
}

function normalizeList(list: unknown): PublicMatchSummary[] {
  if (!Array.isArray(list)) {
    return []
  }
  return list
    .filter(
      (row): row is PublicMatchSummary =>
        !!row && typeof row === 'object' && isUsablePublicMatch(row),
    )
    .slice(0, LIMIT)
}

/**
 * Prefer the edge proxy (shared cache). If the Worker IP is OpenDota-limited,
 * fall back to a direct browser fetch (visitor IP usually still works).
 */
export async function fetchPublicMatchesFeed(options?: {
  timeout?: number
}): Promise<PublicMatchSummary[]> {
  const timeout = options?.timeout ?? 12_000
  try {
    const list = await $fetch<PublicMatchSummary[]>(PROXY_PATH, { timeout })
    return normalizeList(list)
  } catch (err: unknown) {
    const status = statusFromFetchError(err)
    if (status !== 429 && status !== 502 && status !== 503) {
      throw err
    }
    const list = await $fetch<PublicMatchSummary[]>(
      `${OPENDOTA_API}/publicMatches`,
      { timeout },
    )
    return normalizeList(list)
  }
}
