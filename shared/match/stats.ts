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

/** Higher-is-better scoreboard metrics. */
export type MaxStatKey =
  | 'kills'
  | 'assists'
  | 'net_worth'
  | 'gold_per_min'
  | 'xp_per_min'
  | 'last_hits'
  | 'denies'
  | 'hero_damage'
  | 'tower_damage'
  | 'hero_healing'

/** Lower-is-better scoreboard metrics. */
export type MinStatKey = 'deaths'

export type BestStatKey = MaxStatKey | MinStatKey

/**
 * Match-wide extreme for a numeric player field.
 * Ties: every player equal to the extreme is a leader (callers show the badge on all).
 */
export function matchStatExtreme(
  players: MatchPlayer[],
  key: BestStatKey,
  mode: 'max' | 'min' = key === 'deaths' ? 'min' : 'max',
): number | null {
  const values: number[] = []
  for (const player of players) {
    const value = player[key]
    if (isNum(value)) {
      values.push(value)
    }
  }
  if (!values.length) {
    return null
  }
  return mode === 'min' ? Math.min(...values) : Math.max(...values)
}

/**
 * Whether `value` ties the match extreme.
 * Max metrics skip a badge when the extreme is ≤ 0 (avoids starring empty healing/etc.).
 * Min metrics (deaths) always badge ties, including 0.
 */
export function isMatchBestStat(
  value: unknown,
  extreme: number | null,
  mode: 'max' | 'min' = 'max',
): boolean {
  if (!isNum(value) || extreme === null) {
    return false
  }
  if (mode === 'max' && extreme <= 0) {
    return false
  }
  return value === extreme
}

/** Kill participation as displayed percent; null when not computable. */
export function killParticipationPercent(
  player: MatchPlayer,
  teamKills: number | null,
): number | null {
  if (
    !isNum(teamKills) ||
    teamKills <= 0 ||
    !isNum(player.kills) ||
    !isNum(player.assists)
  ) {
    return null
  }
  return Math.round(
    (((player.kills as number) + (player.assists as number)) / teamKills) * 100,
  )
}

export function matchParticipationExtreme(
  players: MatchPlayer[],
  teamKillsFor: (player: MatchPlayer) => number | null,
): number | null {
  const values: number[] = []
  for (const player of players) {
    const value = killParticipationPercent(player, teamKillsFor(player))
    if (value !== null) {
      values.push(value)
    }
  }
  if (!values.length) {
    return null
  }
  return Math.max(...values)
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
