import { isNum } from './parseMatchId'
import type { PublicMatchSummary } from './publicMatches'

/** OpenDota medal band encoded in the tens digit of `rank_tier` / `avg_rank_tier`. */
export const RANK_MEDAL_KEYS = [
  'herald',
  'guardian',
  'crusader',
  'archon',
  'legend',
  'ancient',
  'divine',
  'immortal',
] as const

export type RankMedalKey = (typeof RANK_MEDAL_KEYS)[number]

export type RankTierParts = {
  medal: RankMedalKey
  /** 1–5 stars for medals below Immortal; Immortal uses 0. */
  stars: number
  raw: number
}

/**
 * Decode OpenDota `rank_tier` / `avg_rank_tier` (e.g. 45 → Archon ★★★★★).
 * Returns null when missing or out of range.
 */
export function parseRankTier(raw: unknown): RankTierParts | null {
  if (!isNum(raw) || raw < 11 || raw > 85) {
    return null
  }
  const medalIndex = Math.floor(raw / 10) - 1
  const stars = Math.floor(raw % 10)
  if (medalIndex < 0 || medalIndex >= RANK_MEDAL_KEYS.length) {
    return null
  }
  const medal = RANK_MEDAL_KEYS[medalIndex]
  if (!medal) {
    return null
  }
  if (medal === 'immortal') {
    return { medal, stars: 0, raw }
  }
  if (stars < 1 || stars > 5) {
    return null
  }
  return { medal, stars, raw }
}

/** OpenDota medal icon index 1–8 (Herald…Immortal) for local rank_icon_N.png. */
export function rankTierIconId(parts: RankTierParts): number {
  return RANK_MEDAL_KEYS.indexOf(parts.medal) + 1
}

/** Same-origin path for the medal PNG, or null when tier unknown. */
export function rankTierIconSrc(raw: unknown): string | null {
  const parts = parseRankTier(raw)
  if (!parts) {
    return null
  }
  const id = rankTierIconId(parts)
  if (id < 1 || id > 8) {
    return null
  }
  return `/images/dota2/rank_icons/rank_icon_${id}.png`
}

export type PublicMatchBatchLens = {
  total: number
  radiantWins: number
  direWins: number
  ranked: number
  turbo: number
  withRank: number
  medianDuration: number
}

/** Honest aggregates from the loaded publicMatches batch only. */
export function buildPublicMatchBatchLens(
  rows: PublicMatchSummary[],
): PublicMatchBatchLens {
  const durations: number[] = []
  let radiantWins = 0
  let direWins = 0
  let ranked = 0
  let turbo = 0
  let withRank = 0

  for (const row of rows) {
    if (row.radiant_win === true) {
      radiantWins += 1
    } else if (row.radiant_win === false) {
      direWins += 1
    }
    if (row.lobby_type === 7) {
      ranked += 1
    }
    if (row.game_mode === 23) {
      turbo += 1
    }
    if (parseRankTier(row.avg_rank_tier)) {
      withRank += 1
    }
    if (typeof row.duration === 'number' && row.duration > 0) {
      durations.push(row.duration)
    }
  }

  durations.sort((a, b) => a - b)
  const mid = Math.floor(durations.length / 2)
  const medianDuration =
    durations.length === 0
      ? 0
      : durations.length % 2 === 0
        ? Math.round((durations[mid - 1]! + durations[mid]!) / 2)
        : durations[mid]!

  return {
    total: rows.length,
    radiantWins,
    direWins,
    ranked,
    turbo,
    withRank,
    medianDuration,
  }
}

export type PublicMatchFacet =
  'all' | 'ranked' | 'unranked' | 'turbo' | 'allPick' | 'long'

export type PublicMatchSortKey = 'time' | 'rank'
export type PublicMatchSortDir = 'asc' | 'desc'

export function matchPassesFacet(
  row: PublicMatchSummary,
  facet: PublicMatchFacet,
): boolean {
  switch (facet) {
    case 'all':
      return true
    case 'ranked':
      return row.lobby_type === 7
    case 'unranked':
      return row.lobby_type === 0
    case 'turbo':
      return row.game_mode === 23
    case 'allPick':
      return row.game_mode === 22 || row.game_mode === 1
    case 'long':
      return typeof row.duration === 'number' && row.duration >= 2400
    default:
      return true
  }
}

function sortMetric(
  row: PublicMatchSummary,
  key: PublicMatchSortKey,
): number | null {
  if (key === 'time') {
    return typeof row.start_time === 'number' && Number.isFinite(row.start_time)
      ? row.start_time
      : null
  }
  return typeof row.avg_rank_tier === 'number' &&
    Number.isFinite(row.avg_rank_tier)
    ? row.avg_rank_tier
    : null
}

/** Stable sort for the public matches feed (null metrics sink to the end). */
export function sortPublicMatches(
  rows: PublicMatchSummary[],
  key: PublicMatchSortKey,
  dir: PublicMatchSortDir,
): PublicMatchSummary[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = sortMetric(a, key)
    const bv = sortMetric(b, key)
    if (av == null && bv == null) {
      return a.match_id - b.match_id
    }
    if (av == null) {
      return 1
    }
    if (bv == null) {
      return -1
    }
    if (av !== bv) {
      return (av - bv) * sign
    }
    return a.match_id - b.match_id
  })
}
