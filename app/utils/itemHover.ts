import type { ItemAbility, ItemAttrib, ItemEntry } from '#shared/match'

export function itemStatLines(entry: ItemEntry | undefined): string[] {
  if (!entry?.attrib?.length) {
    return []
  }
  const lines: string[] = []
  for (const row of entry.attrib) {
    const line = formatAttribLine(row)
    if (line) {
      lines.push(line)
    }
  }
  return lines
}

export function formatAttribLine(row: ItemAttrib): string | null {
  if (!row.display || row.value === undefined) {
    return null
  }
  return row.display.replaceAll('{value}', row.value)
}

export function itemBehaviorLabel(entry: ItemEntry | undefined): string | null {
  if (!entry?.behavior?.length) {
    return null
  }
  return entry.behavior.join(', ')
}

export function itemAffectsLabel(entry: ItemEntry | undefined): string | null {
  const parts = [entry?.target_team, entry?.target_type].filter(
    (part): part is string => Boolean(part && part.trim()),
  )
  return parts.length ? parts.join(' · ') : null
}

export function emphasizeNumberSegments(
  text: string,
): { bold: boolean; text: string }[] {
  return text
    .split(/(\d+(?:\.\d+)?%?)/g)
    .filter((part) => part.length > 0)
    .map((part) => ({
      bold: /^\d+(?:\.\d+)?%?$/.test(part),
      text: part,
    }))
}

export function splitAbilityBody(description: string): {
  prose: string
  footers: { label: string; value: string }[]
} {
  const chunks = description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const footers: { label: string; value: string }[] = []
  const proseParts: string[] = []
  for (const line of chunks) {
    const match = /^([^:]+):\s*(.+)$/.exec(line)
    if (match && match[1]!.length < 40) {
      footers.push({ label: match[1]!, value: match[2]! })
    } else {
      proseParts.push(line)
    }
  }
  return { prose: proseParts.join('\n\n'), footers }
}

export type AbilityKind =
  'active' | 'passive' | 'use' | 'toggle' | 'upgrade' | 'other'

const KNOWN_KINDS = new Set<AbilityKind>([
  'active',
  'passive',
  'use',
  'toggle',
  'upgrade',
])

const TRIGGERED_KINDS = new Set<AbilityKind>([
  'active',
  'use',
  'toggle',
  'upgrade',
])

const HEADING_I18N: Record<Exclude<AbilityKind, 'other'>, string> = {
  active: 'itemHover.active',
  passive: 'itemHover.passive',
  use: 'itemHover.use',
  toggle: 'itemHover.toggle',
  upgrade: 'itemHover.upgrade',
}

export function abilityKind(ability: ItemAbility): AbilityKind {
  const type = (ability.type || '').toLowerCase()
  if (KNOWN_KINDS.has(type as AbilityKind)) {
    return type as AbilityKind
  }
  return 'other'
}

export function isTriggeredAbilityKind(kind: AbilityKind): boolean {
  return TRIGGERED_KINDS.has(kind)
}

export function abilityHeadingI18nKey(kind: AbilityKind): string | null {
  if (kind === 'other') {
    return null
  }
  return HEADING_I18N[kind]
}
