import type { RecentMatch, SavedMatch } from './types'

const MATCH_ID_RE = /^\d{1,16}$/

function isMatchId(value: unknown): value is string | number {
  return MATCH_ID_RE.test(String(value))
}

function optionalBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function sanitizeSavedMatches(raw: unknown, max: number): SavedMatch[] {
  if (!Array.isArray(raw) || max < 1) {
    return []
  }

  const out: SavedMatch[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const value = entry as Record<string, unknown>
    if (!isMatchId(value.id)) {
      continue
    }
    out.push({
      id: String(value.id),
      radiant_win: optionalBool(value.radiant_win),
      duration: optionalFiniteNumber(value.duration),
      start_time: optionalFiniteNumber(value.start_time),
    })
    if (out.length >= max) {
      break
    }
  }
  return out
}

export function sanitizeRecentMatches(
  raw: unknown,
  max: number,
): RecentMatch[] {
  if (!Array.isArray(raw) || max < 1) {
    return []
  }

  const out: RecentMatch[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const value = entry as Record<string, unknown>
    if (!isMatchId(value.id)) {
      continue
    }
    if (
      typeof value.openedAt !== 'number' ||
      !Number.isFinite(value.openedAt)
    ) {
      continue
    }
    out.push({
      id: String(value.id),
      radiant_win: optionalBool(value.radiant_win),
      duration: optionalFiniteNumber(value.duration),
      openedAt: value.openedAt,
    })
    if (out.length >= max) {
      break
    }
  }
  return out
}

export function upsertSavedMatch(
  list: SavedMatch[],
  entry: SavedMatch,
  max: number,
): { next: SavedMatch[]; evicted: boolean } {
  if (!MATCH_ID_RE.test(entry.id) || max < 1) {
    return { next: list.slice(0, Math.max(0, max)), evicted: false }
  }

  const without = list.filter((item) => item.id !== entry.id)
  const atCap = without.length >= max
  const next = [entry, ...without].slice(0, max)
  return { next, evicted: atCap }
}

export function refreshSavedMatchMeta(
  list: SavedMatch[],
  id: string,
  meta: Pick<SavedMatch, 'radiant_win' | 'duration' | 'start_time'>,
): SavedMatch[] | null {
  const index = list.findIndex((entry) => entry.id === id)
  if (index < 0) {
    return null
  }

  const current = list[index]!
  if (
    current.radiant_win === meta.radiant_win &&
    current.duration === meta.duration &&
    current.start_time === meta.start_time
  ) {
    return null
  }

  const next = list.slice()
  next[index] = {
    ...current,
    radiant_win: meta.radiant_win,
    duration: meta.duration,
    start_time: meta.start_time,
  }
  return next
}
