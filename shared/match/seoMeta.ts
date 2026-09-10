import { isNum } from './parseMatchId'
import { duration } from './stats'
import type { MatchData, MatchPlayer } from './types'

export type SeoLocale = 'en' | 'uk'

export type MatchSeoCopy = {
  title: string
  description: string
  winnerLabel: string
  scoreLine: string
  durationLabel: string
}

type HeroLookup = Record<string, { localized_name?: string } | undefined>

const COPY = {
  en: {
    siteName: 'Ancient Lens',
    radiant: 'Radiant',
    dire: 'Dire',
    win: 'victory',
    title: (id: string, winner: string, score: string) =>
      `Match #${id} — ${winner} ${score} | Ancient Lens`,
    description: (
      id: string,
      winner: string,
      score: string,
      dur: string,
      heroes: string,
    ) =>
      `Dota 2 match #${id}: ${winner} win ${score} in ${dur}. ${heroes} OpenDota stats on Ancient Lens.`,
    fallbackTitle: (id: string) => `Match #${id} | Ancient Lens`,
    fallbackDescription:
      'Dota 2 match stats: result, players, economy, and items. OpenDota data.',
  },
  uk: {
    siteName: 'Ancient Lens',
    radiant: 'Radiant',
    dire: 'Dire',
    win: 'перемога',
    title: (id: string, winner: string, score: string) =>
      `Матч #${id} — ${winner} ${score} | Ancient Lens`,
    description: (
      id: string,
      winner: string,
      score: string,
      dur: string,
      heroes: string,
    ) =>
      `Матч Dota 2 #${id}: перемога ${winner} ${score} за ${dur}. ${heroes} Статистика OpenDota на Ancient Lens.`,
    fallbackTitle: (id: string) => `Матч #${id} | Ancient Lens`,
    fallbackDescription:
      'Статистика матчу Dota 2: результат, гравці, економіка та предмети. Дані OpenDota.',
  },
} as const

function isRadiantPlayer(player: MatchPlayer): boolean {
  if (typeof player.isRadiant === 'boolean') {
    return player.isRadiant
  }
  if (isNum(player.player_slot)) {
    return player.player_slot < 128
  }
  return false
}

function heroName(player: MatchPlayer, heroes: HeroLookup | undefined): string {
  const id = player.hero_id
  if (!isNum(id)) {
    return 'Unknown'
  }
  return heroes?.[String(id)]?.localized_name || `Hero ${id}`
}

function lineup(
  players: MatchPlayer[],
  radiant: boolean,
  heroes: HeroLookup | undefined,
): string {
  return players
    .filter((p) => isRadiantPlayer(p) === radiant)
    .map((p) => heroName(p, heroes))
    .join(', ')
}

/** Shared match SEO strings for client + Worker parity. */
export function buildMatchSeoCopy(
  match: MatchData | null | undefined,
  options: {
    matchId: string
    locale?: SeoLocale
    heroes?: HeroLookup
  },
): MatchSeoCopy {
  const locale = options.locale === 'uk' ? 'uk' : 'en'
  const copy = COPY[locale]
  const id = options.matchId

  if (!match) {
    return {
      title: copy.fallbackTitle(id),
      description: copy.fallbackDescription,
      winnerLabel: '',
      scoreLine: '',
      durationLabel: '',
    }
  }

  const radiantScore = isNum(match.radiant_score) ? match.radiant_score : 0
  const direScore = isNum(match.dire_score) ? match.dire_score : 0
  const scoreLine = `${radiantScore}:${direScore}`
  const winnerTeam =
    match.radiant_win === true
      ? copy.radiant
      : match.radiant_win === false
        ? copy.dire
        : copy.radiant
  const dur = duration(match.duration)
  const players = Array.isArray(match.players) ? match.players : []
  const radiantHeroes = lineup(players, true, options.heroes)
  const direHeroes = lineup(players, false, options.heroes)
  const heroesBlurb = [radiantHeroes, direHeroes].filter(Boolean).join(' vs ')

  return {
    title: copy.title(id, winnerTeam, scoreLine),
    description: copy.description(
      id,
      winnerTeam,
      scoreLine,
      dur,
      heroesBlurb ? `${heroesBlurb}.` : '',
    ),
    winnerLabel: `${winnerTeam} ${copy.win}`,
    scoreLine,
    durationLabel: dur,
  }
}

export function matchAbsoluteUrl(
  origin: string,
  matchId: string,
  locale: SeoLocale = 'en',
): string {
  const base = origin.replace(/\/$/, '')
  return locale === 'uk'
    ? `${base}/uk/match/${matchId}`
    : `${base}/match/${matchId}`
}

export function formatPlayerSeoLine(
  player: MatchPlayer,
  heroes: HeroLookup | undefined,
): string {
  const name = heroName(player, heroes)
  const k = isNum(player.kills) ? player.kills : 0
  const d = isNum(player.deaths) ? player.deaths : 0
  const a = isNum(player.assists) ? player.assists : 0
  const nw = isNum(player.net_worth) ? player.net_worth : 0
  return `${name} ${k}/${d}/${a} NW ${nw}`
}
