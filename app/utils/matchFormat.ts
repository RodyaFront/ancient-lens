import { isNum, kda } from '#shared/match'
import {
  GAME_MODES,
  LOBBY_LABELS,
  REGIONS,
  STEAM_CDN,
} from '#shared/match/constants'
import type { MatchPlayer } from '#shared/match/types'

export function formatNumber(value: unknown): string {
  return isNum(value) ? value.toLocaleString('uk-UA') : '—'
}

export function formatShort(value: unknown): string {
  if (!isNum(value)) {
    return '—'
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : formatNumber(value)
}

export function formatDate(value: unknown): string {
  if (!isNum(value)) {
    return 'Дата не надана'
  }

  return new Intl.DateTimeFormat('uk-UA', {
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
    return 'щойно'
  }
  if (deltaSec < 3600) {
    return `${Math.floor(deltaSec / 60)} хв тому`
  }
  if (deltaSec < 86400) {
    return `${Math.floor(deltaSec / 3600)} год тому`
  }
  if (deltaSec < 86400 * 7) {
    return `${Math.floor(deltaSec / 86400)} д тому`
  }

  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(
    new Date(openedAt),
  )
}

export function playerDisplayName(player: MatchPlayer): string {
  return (
    player.personaname ||
    player.name ||
    (player.account_id ? `Гравець ${player.account_id}` : 'Анонімний гравець')
  )
}

export function lobbyLabel(lobbyType: unknown): string {
  if (!isNum(lobbyType)) {
    return 'Матч Dota 2'
  }

  return LOBBY_LABELS[lobbyType] ?? 'Матч Dota 2'
}

export function gameModeLabel(mode: unknown): string {
  if (!isNum(mode)) {
    return 'Режим —'
  }

  return GAME_MODES[mode] ?? `Режим ${mode}`
}

export function regionLabel(region: unknown): string {
  if (!isNum(region)) {
    return 'Не надано'
  }

  return REGIONS[region] ?? 'Не надано'
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
    return 'Перемога Radiant'
  }
  if (entry.radiant_win === false) {
    return 'Перемога Dire'
  }
  return 'Результат не надано'
}

export function formatKda(player: MatchPlayer): string {
  const value = kda(player)
  return isNum(value) ? value.toFixed(2) : '—'
}

export function flagLabel(value: unknown): string {
  if (value === 1) {
    return 'так'
  }
  if (value === 0) {
    return 'ні'
  }
  return '—'
}

export function playerItemId(
  player: MatchPlayer,
  key: string,
): number | undefined {
  const value = player[key]
  return typeof value === 'number' ? value : undefined
}
