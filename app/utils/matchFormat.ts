import { isNum, kda } from '#shared/match'
import {
  GAME_MODES,
  LOBBY_LABELS,
  REGIONS,
  STEAM_CDN,
} from '#shared/match/constants'
import type { MatchPlayer } from '#shared/match/types'

function i18n() {
  return useNuxtApp().$i18n
}

function localeTag(): string {
  return i18n().locale.value === 'uk' ? 'uk-UA' : 'en-US'
}

export function formatNumber(value: unknown): string {
  return isNum(value)
    ? value.toLocaleString(localeTag())
    : i18n().t('format.emDash')
}

export function formatShort(value: unknown): string {
  if (!isNum(value)) {
    return i18n().t('format.emDash')
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : formatNumber(value)
}

export function formatDate(value: unknown): string {
  if (!isNum(value)) {
    return i18n().t('format.dateMissing')
  }

  return new Intl.DateTimeFormat(localeTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}

export function formatRelativeOpened(openedAt: unknown): string {
  if (!isNum(openedAt)) {
    return ''
  }

  const deltaSec = Math.max(0, Math.round((Date.now() - openedAt) / 1000))
  if (deltaSec < 60) {
    return i18n().t('format.justNow')
  }
  if (deltaSec < 3600) {
    return i18n().t('format.minutesAgo', { n: Math.floor(deltaSec / 60) })
  }
  if (deltaSec < 86400) {
    return i18n().t('format.hoursAgo', { n: Math.floor(deltaSec / 3600) })
  }
  if (deltaSec < 86400 * 7) {
    return i18n().t('format.daysAgo', { n: Math.floor(deltaSec / 86400) })
  }

  return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'medium' }).format(
    new Date(openedAt),
  )
}

export function playerDisplayName(player: MatchPlayer): string {
  return (
    player.personaname ||
    player.name ||
    (player.account_id
      ? i18n().t('format.playerNamed', { id: player.account_id })
      : i18n().t('format.anonymousPlayer'))
  )
}

export type LobbyTone = 'ranked' | 'tournament' | 'practice' | 'unranked'

/** Lobby color tone — Ranked = competitive ladder (`--ranked` / `.tone-ranked`). */
export function lobbyTone(lobbyType: unknown): LobbyTone | null {
  if (!isNum(lobbyType)) {
    return null
  }

  switch (lobbyType) {
    case 7:
      return 'ranked'
    case 2:
      return 'tournament'
    case 1:
      return 'practice'
    case 0:
      return 'unranked'
    default:
      return null
  }
}

export function lobbyLabel(lobbyType: unknown): string {
  if (!isNum(lobbyType)) {
    return i18n().t('format.dotaMatch')
  }

  return LOBBY_LABELS[lobbyType] ?? i18n().t('format.dotaMatch')
}

export function gameModeLabel(mode: unknown): string {
  if (!isNum(mode)) {
    return i18n().t('format.modeUnknown')
  }

  return GAME_MODES[mode] ?? i18n().t('format.modeNumber', { mode })
}

export function regionLabel(region: unknown): string {
  if (!isNum(region)) {
    return i18n().t('format.notProvided')
  }

  return REGIONS[region] ?? i18n().t('format.notProvided')
}

export function steamAssetUrl(path: string | undefined): string | null {
  if (!path?.startsWith('/apps/dota2/')) {
    return null
  }

  return `${STEAM_CDN}${path}`
}

export function initials(text: string, length = 2): string {
  return text.slice(0, length).toUpperCase()
}

export function savedResultLabel(entry: { radiant_win?: boolean }): string {
  if (entry.radiant_win === true) {
    return i18n().t('format.radiantWin')
  }
  if (entry.radiant_win === false) {
    return i18n().t('format.direWin')
  }
  return i18n().t('format.resultUnknown')
}

export function formatKda(player: MatchPlayer): string {
  const value = kda(player)
  return isNum(value) ? value.toFixed(2) : i18n().t('format.emDash')
}

export function flagLabel(value: unknown): string {
  if (value === 1) {
    return i18n().t('format.yes')
  }
  if (value === 0) {
    return i18n().t('format.no')
  }
  return i18n().t('format.emDash')
}

export function playerItemId(
  player: MatchPlayer,
  key: string,
): number | undefined {
  const value = player[key]
  return typeof value === 'number' ? value : undefined
}
