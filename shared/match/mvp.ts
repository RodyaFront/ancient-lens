import { isNum } from './parseMatchId'
import { kda, radiant } from './stats'
import type { MatchData, MatchPlayer } from './types'

/**
 * Unparsed-friendly composite for Match MVP (winning team only).
 * Calibrated so match 8989932772 ranks Lone Druid first among Dire winners.
 */
export function matchMvpScore(player: MatchPlayer): number {
  const kills = isNum(player.kills) ? player.kills : 0
  const deaths = isNum(player.deaths) ? player.deaths : 0
  const assists = isNum(player.assists) ? player.assists : 0
  const ratio = (kills + assists) / Math.max(1, deaths)
  const nw = isNum(player.net_worth) ? player.net_worth : 0
  const gpm = isNum(player.gold_per_min) ? player.gold_per_min : 0
  const hd = isNum(player.hero_damage) ? player.hero_damage : 0
  const td = isNum(player.tower_damage) ? player.tower_damage : 0
  const hh = isNum(player.hero_healing) ? player.hero_healing : 0

  return (
    ratio * 4 +
    (nw / 1000) * 1.2 +
    (gpm / 100) * 1.5 +
    (hd / 10_000) * 2 +
    (td / 10_000) * 3.5 +
    (hh / 5000) * 1.5 +
    kills * 0.4 +
    assists * 0.15
  )
}

function netWorth(player: MatchPlayer): number {
  return isNum(player.net_worth) ? player.net_worth : 0
}

function kdaValue(player: MatchPlayer): number {
  return kda(player) ?? 0
}

/**
 * Pick Match MVP from the winning side. Null when result unknown or no winners.
 */
export function pickMatchMvp(
  match: Pick<MatchData, 'radiant_win'>,
  players: MatchPlayer[],
): MatchPlayer | null {
  if (match.radiant_win !== true && match.radiant_win !== false) {
    return null
  }

  const winners = players.filter(
    (player) => radiant(player) === match.radiant_win,
  )
  if (!winners.length) {
    return null
  }

  let best = winners[0]!
  let bestScore = matchMvpScore(best)

  for (let index = 1; index < winners.length; index++) {
    const candidate = winners[index]!
    const score = matchMvpScore(candidate)
    if (score > bestScore) {
      best = candidate
      bestScore = score
      continue
    }
    if (score < bestScore) {
      continue
    }
    // Tie-break: higher net worth, then higher KDA.
    if (netWorth(candidate) > netWorth(best)) {
      best = candidate
      continue
    }
    if (
      netWorth(candidate) === netWorth(best) &&
      kdaValue(candidate) > kdaValue(best)
    ) {
      best = candidate
    }
  }

  return best
}
