import type { HeroMetaEntry, HeroMetaSnapshot } from './types'

/** Normalize one OpenDota `/heroStats` row into a thin meta entry. */
export function normalizeHeroMetaRow(raw: unknown): HeroMetaEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'number') {
    return null
  }
  const pubPick =
    typeof row.pub_pick === 'number'
      ? row.pub_pick
      : sumBracketField(row, 'pick')
  const pubWin =
    typeof row.pub_win === 'number' ? row.pub_win : sumBracketField(row, 'win')
  if (!Number.isFinite(pubPick) || !Number.isFinite(pubWin)) {
    return null
  }
  return {
    id: row.id,
    pub_pick: pubPick,
    pub_win: pubWin,
  }
}

function sumBracketField(
  row: Record<string, unknown>,
  kind: 'pick' | 'win',
): number {
  let total = 0
  for (let bracket = 1; bracket <= 8; bracket += 1) {
    const value = row[`${bracket}_${kind}`]
    if (typeof value === 'number' && Number.isFinite(value)) {
      total += value
    }
  }
  return total
}

export function buildHeroMetaSnapshot(
  rows: unknown[],
  fetchedAt = new Date().toISOString(),
): HeroMetaSnapshot {
  const byId: Record<string, HeroMetaEntry> = {}
  for (const raw of rows) {
    const entry = normalizeHeroMetaRow(raw)
    if (entry) {
      byId[String(entry.id)] = entry
    }
  }
  return { fetched_at: fetchedAt, byId }
}
