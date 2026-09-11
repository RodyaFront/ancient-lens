import type { MatchPlayer } from './types'

/** Current Dota max hero level. Cap scoreboard skill columns. */
export const MAX_SKILL_COLUMNS = 30

/**
 * How many level columns to show for a match: max upgrade array length,
 * capped at MAX_SKILL_COLUMNS. Returns 0 when no player has upgrades.
 */
export function skillColumnCount(
  players: Array<Pick<MatchPlayer, 'ability_upgrades_arr'>>,
): number {
  let max = 0
  for (const player of players) {
    const list = player.ability_upgrades_arr
    if (!Array.isArray(list)) {
      continue
    }
    if (list.length > max) {
      max = list.length
    }
  }
  return Math.min(max, MAX_SKILL_COLUMNS)
}

/**
 * Ability id taken at hero level (1-based), or undefined when missing /
 * never reached.
 */
export function upgradeAtLevel(
  player: Pick<MatchPlayer, 'ability_upgrades_arr'>,
  level: number,
): number | undefined {
  if (!Number.isInteger(level) || level < 1) {
    return undefined
  }
  const list = player.ability_upgrades_arr
  if (!Array.isArray(list)) {
    return undefined
  }
  const id = list[level - 1]
  return typeof id === 'number' && Number.isFinite(id) ? id : undefined
}

/**
 * How many times this ability was skilled from level 1 through `level`
 * (1-based ability rank for tooltip value highlighting).
 */
export function skillRankAtLevel(
  player: Pick<MatchPlayer, 'ability_upgrades_arr'>,
  level: number,
): number | undefined {
  const id = upgradeAtLevel(player, level)
  if (id === undefined) {
    return undefined
  }
  let rank = 0
  for (let step = 1; step <= level; step += 1) {
    if (upgradeAtLevel(player, step) === id) {
      rank += 1
    }
  }
  return rank > 0 ? rank : undefined
}
