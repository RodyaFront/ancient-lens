import type { MatchPlayer } from './types'

/**
 * OpenDota `cluster` → coarse region id used by {@link REGIONS}.
 * Incomplete on purpose; unknown clusters fall back to “not provided”.
 */
export const CLUSTER_REGION: Record<number, number> = {
  111: 1,
  112: 1,
  113: 1,
  114: 1,
  117: 1,
  118: 1,
  121: 2,
  122: 2,
  123: 2,
  124: 2,
  131: 3,
  132: 25,
  133: 3,
  134: 25,
  135: 3,
  136: 25,
  137: 3,
  138: 25,
  141: 19,
  142: 19,
  143: 19,
  144: 19,
  145: 19,
  151: 5,
  152: 5,
  153: 5,
  154: 5,
  155: 5,
  156: 5,
  161: 6,
  162: 6,
  163: 6,
  171: 8,
  172: 8,
  181: 7,
  182: 7,
  183: 7,
  184: 7,
  185: 7,
  186: 7,
  187: 7,
  188: 7,
  189: 7,
  191: 9,
  192: 9,
  193: 9,
  200: 12,
  201: 12,
  202: 12,
  203: 12,
  204: 12,
  211: 10,
  212: 10,
  213: 10,
  214: 10,
  221: 11,
  222: 14,
  223: 15,
  224: 16,
  225: 10,
  227: 13,
  231: 14,
  232: 15,
  236: 18,
  241: 16,
  251: 19,
  261: 20,
  271: 8,
  272: 8,
  273: 8,
  274: 8,
  346: 2,
  347: 2,
  410: 2,
  412: 2,
  // Newer SEA / Asia clusters seen on publicMatches (not yet in odota cluster.json).
  413: 5,
  414: 5,
  415: 5,
  416: 5,
  417: 5,
  418: 5,
  436: 5,
}

export type PublicMatchSummary = {
  match_id: number
  match_seq_num?: number
  radiant_win?: boolean
  start_time?: number
  duration?: number
  lobby_type?: number
  game_mode?: number
  avg_rank_tier?: number
  num_rank_tier?: number
  cluster?: number
  radiant_team?: number[]
  dire_team?: number[]
}

export function clusterRegionId(cluster: unknown): number | null {
  if (typeof cluster !== 'number' || !Number.isFinite(cluster)) {
    return null
  }
  return CLUSTER_REGION[cluster] ?? null
}

export function isUsablePublicMatch(row: PublicMatchSummary): boolean {
  if (typeof row.match_id !== 'number' || !Number.isFinite(row.match_id)) {
    return false
  }
  if (typeof row.duration !== 'number' || row.duration <= 0) {
    return false
  }
  const radiant = Array.isArray(row.radiant_team) ? row.radiant_team : []
  const dire = Array.isArray(row.dire_team) ? row.dire_team : []
  const heroes = [...radiant, ...dire].filter(
    (id) => typeof id === 'number' && id > 0,
  )
  return heroes.length >= 8
}

/** Dummy player for portrait-only chips (no hover level). */
export function publicMatchHeroPlayer(heroId: number): MatchPlayer {
  return { hero_id: heroId }
}

/**
 * Always five draft slots for public-match strips (pad / trim team ids).
 * Invalid or missing entries become `null` placeholders.
 */
export function heroSlots(ids: number[] | undefined): Array<number | null> {
  const known = (ids || [])
    .filter((id): id is number => typeof id === 'number' && id > 0)
    .slice(0, 5)
  return Array.from({ length: 5 }, (_, index) => known[index] ?? null)
}
