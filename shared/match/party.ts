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
 */
export function buildPartyMarks(
  players: MatchPlayer[],
): Array<PartyMark | null> {
  const counts = new Map<number, number>()
  for (const player of players) {
    const id = player.party_id
    if (typeof id !== 'number' || !Number.isFinite(id)) {
      continue
    }
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const ordinalByPartyId = new Map<number, number>()
  let next = 1
  for (const player of players) {
    const id = player.party_id
    if (typeof id !== 'number' || !Number.isFinite(id)) {
      continue
    }
    if ((counts.get(id) ?? 0) < 2) {
      continue
    }
    if (!ordinalByPartyId.has(id)) {
      ordinalByPartyId.set(id, next++)
    }
  }

  return players.map((player) => {
    const id = player.party_id
    if (typeof id !== 'number' || !Number.isFinite(id)) {
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
