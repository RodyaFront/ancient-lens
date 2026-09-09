import { isNum } from './parseMatchId'
import type { MatchData, MatchPlayer } from './types'

export type ValidateMatchErrorCode = 'mismatch' | 'noPlayers'

export class ValidateMatchError extends Error {
  readonly code: ValidateMatchErrorCode

  constructor(code: ValidateMatchErrorCode) {
    super(code)
    this.name = 'ValidateMatchError'
    this.code = code
  }
}

export function radiant(player: MatchPlayer): boolean {
  if (typeof player.isRadiant === 'boolean') {
    return player.isRadiant
  }
  if (isNum(player.player_slot)) {
    return player.player_slot < 128
  }
  return player.team_number === 0
}

export function total(
  players: MatchPlayer[],
  key: keyof MatchPlayer,
): number | null {
  if (!players.length || !players.every((player) => isNum(player[key]))) {
    return null
  }

  return players.reduce((sum, player) => sum + (player[key] as number), 0)
}

export function kda(player: MatchPlayer): number | null {
  if (![player.kills, player.deaths, player.assists].every(isNum)) {
    return null
  }

  return (
    ((player.kills as number) + (player.assists as number)) /
    Math.max(1, player.deaths as number)
  )
}

export function duration(seconds: unknown): string {
  if (!isNum(seconds) || seconds < 0) {
    return '—'
  }

  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export function validateMatch(data: unknown, id: string): MatchData {
  if (
    !data ||
    typeof data !== 'object' ||
    String((data as MatchData).match_id) !== String(id)
  ) {
    throw new ValidateMatchError('mismatch')
  }

  const match = data as MatchData
  if (!Array.isArray(match.players) || !match.players.length) {
    throw new ValidateMatchError('noPlayers')
  }

  return match
}
