import type { MatchPlayer } from './types'

const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
] as const

export interface PartyMark {
  /** 1-based order among multi-player parties (first appearance in match). */
  ordinal: number
  roman: string
  size: number
  partyId: number
}

export function toRoman(n: number): string {
  if (n < 1) {
    return String(n)
  }
  return ROMAN[n - 1] ?? String(n)
}

/**
 * Marks players who share a `party_id` with at least one other player.
 * Solo queues get `null`. Ordinals follow first appearance in `players` order.
 *
 * OpenDota also stamps the whole lobby as one `party_id` (often `0`) with
 * `party_size` 10 in practice/custom games. That is not a queue party — skip
 * groups of the entire match, and groups larger than a Dota party (5).
 */
export function buildPartyMarks(
  players: MatchPlayer[],
): Array<PartyMark | null> {
  const counts = new Map<number, number>()
  for (const player of players) {
    const id = finitePartyId(player.party_id)
    if (id === null) {
      continue
    }
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const matchSize = players.length
  const ordinalByPartyId = new Map<number, number>()
  let next = 1
  for (const player of players) {
    const id = finitePartyId(player.party_id)
    if (id === null) {
      continue
    }
    if (!isScoreboardPartySize(counts.get(id) ?? 0, matchSize)) {
      continue
    }
    if (!ordinalByPartyId.has(id)) {
      ordinalByPartyId.set(id, next++)
    }
  }

  return players.map((player) => {
    const id = finitePartyId(player.party_id)
    if (id === null) {
      return null
    }
    const ordinal = ordinalByPartyId.get(id)
    if (!ordinal) {
      return null
    }
    return {
      ordinal,
      roman: toRoman(ordinal),
      size: counts.get(id) ?? 0,
      partyId: id,
    }
  })
}

function finitePartyId(id: unknown): number | null {
  return typeof id === 'number' && Number.isFinite(id) ? id : null
}

/** Queue parties are 2–5. A group that is the whole lobby is not a party. */
function isScoreboardPartySize(size: number, matchSize: number): boolean {
  return size >= 2 && size <= 5 && size < matchSize
}
