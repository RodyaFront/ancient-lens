import type { AbilityAttrib, AbilityEntry } from '#shared/match'

/** Clean OpenDota talent placeholders like `{s:bonus_burn_damage_pct}`. */
export function cleanAbilityName(dname: string | undefined): string {
  if (!dname) {
    return ''
  }
  return dname
    .replace(/\{s:[^}]+\}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+%/g, '%')
    .replace(/\+\s+/g, '+')
    .trim()
}

export function joinLevelValues(values: string[] | undefined): string {
  if (!values?.length) {
    return ''
  }
  return values.join(' / ')
}

/**
 * Format a levelled value chain; when skillRank is set (1-based), wrap that
 * rank for emphasis in the UI via segments.
 */
export function formatLevelValueSegments(
  values: string[] | undefined,
  skillRank: number | null | undefined,
): { bold: boolean; active: boolean; text: string }[] {
  if (!values?.length) {
    return []
  }
  const activeIndex =
    typeof skillRank === 'number' &&
    Number.isInteger(skillRank) &&
    skillRank >= 1
      ? Math.min(skillRank, values.length) - 1
      : -1

  const segments: { bold: boolean; active: boolean; text: string }[] = []
  values.forEach((value, index) => {
    if (index > 0) {
      segments.push({ bold: false, active: false, text: ' / ' })
    }
    const active = index === activeIndex
    segments.push({
      bold: true,
      active,
      text: value,
    })
  })
  return segments
}

export function abilityBehaviorLabel(
  entry: AbilityEntry | undefined,
): string | null {
  if (!entry?.behavior?.length) {
    return null
  }
  return entry.behavior.join(', ')
}

export function abilityAffectsLabel(
  entry: AbilityEntry | undefined,
): string | null {
  const team = entry?.target_team?.trim()
  const types = entry?.target_type?.filter(Boolean) ?? []
  const parts = [team, types.length ? types.join(', ') : null].filter(
    (part): part is string => Boolean(part),
  )
  return parts.length ? parts.join(' · ') : null
}

export type AbilityMetaTone =
  'magical' | 'physical' | 'pure' | 'yes' | 'no' | null

export function damageTypeTone(value: string | undefined): AbilityMetaTone {
  const key = value?.trim().toLowerCase()
  if (key === 'magical') {
    return 'magical'
  }
  if (key === 'physical') {
    return 'physical'
  }
  if (key === 'pure') {
    return 'pure'
  }
  return null
}

export function yesNoTone(value: string | undefined): AbilityMetaTone {
  const key = value?.trim().toLowerCase()
  if (key === 'yes') {
    return 'yes'
  }
  if (key === 'no') {
    return 'no'
  }
  return null
}

export type AbilityAttribRow = {
  label: string
  valueSegments: { bold: boolean; active: boolean; text: string }[]
}

export function abilityAttribRows(
  entry: AbilityEntry | undefined,
  skillRank: number | null | undefined,
): AbilityAttribRow[] {
  if (!entry?.attrib?.length) {
    return []
  }
  const rows: AbilityAttribRow[] = []
  for (const row of entry.attrib) {
    if (row.generated) {
      continue
    }
    const formatted = formatAttribRow(row, skillRank)
    if (formatted) {
      rows.push(formatted)
    }
  }
  // If everything was generated-only, fall back to all rows with headers.
  if (!rows.length) {
    for (const row of entry.attrib) {
      const formatted = formatAttribRow(row, skillRank)
      if (formatted) {
        rows.push(formatted)
      }
    }
  }
  return rows
}

function formatAttribRow(
  row: AbilityAttrib,
  skillRank: number | null | undefined,
): AbilityAttribRow | null {
  const label = (row.header || row.key || '').replace(/:$/, '').trim()
  if (!label || !row.value?.length) {
    return null
  }
  return {
    label,
    valueSegments: formatLevelValueSegments(row.value, skillRank),
  }
}

export function hasAbilityResources(entry: AbilityEntry | undefined): boolean {
  return Boolean(entry?.mc?.length || entry?.cd?.length)
}
