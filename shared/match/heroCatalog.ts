import type { HeroEntry, HeroMetaEntry, HeroProfile } from './types'

/**
 * Dota armor from agility (Valve: 1 armor per 6 agi).
 * Display armor at base stats ≈ base_armor + base_agi / 6.
 */
export const ARMOR_PER_AGI = 1 / 6
export const HP_PER_STR = 22
export const MANA_PER_INT = 12
export const HP_REGEN_PER_STR = 0.1
export const MANA_REGEN_PER_INT = 0.05
/** Universal heroes gain 0.7 damage per point of each attribute. */
export const UNIVERSAL_DAMAGE_FACTOR = 0.7

export type PrimaryAttrKey = 'str' | 'agi' | 'int' | 'all'

export function createHeroCatalog(heroes: Record<string, HeroEntry>) {
  return {
    getById(id: number | undefined): HeroEntry | undefined {
      if (id == null) {
        return undefined
      }
      return heroes[String(id)]
    },
  }
}

export type HeroCatalog = ReturnType<typeof createHeroCatalog>

export function primaryAttrKey(
  attr: string | undefined,
): PrimaryAttrKey | undefined {
  if (!attr) {
    return undefined
  }
  const key = attr.trim().toLowerCase()
  if (key === 'str' || key === 'agi' || key === 'int' || key === 'all') {
    return key
  }
  return undefined
}

/** i18n key path under `heroHover.primary.*`. */
export function primaryAttrI18nKey(
  attr: string | undefined,
): string | undefined {
  const key = primaryAttrKey(attr)
  return key ? `heroHover.primary.${key}` : undefined
}

/** Local Dotabuff-style attribute glyph under `public/images/dota2/`. */
export function primaryAttrIconSrc(
  attr: string | PrimaryAttrKey | undefined,
): string | undefined {
  const key = primaryAttrKey(attr)
  return key ? `/images/dota2/hero_${key}.png` : undefined
}

export function displayArmor(entry: HeroEntry | undefined): number | null {
  if (!entry) {
    return null
  }
  if (typeof entry.base_armor !== 'number') {
    return null
  }
  const agi = typeof entry.base_agi === 'number' ? entry.base_agi : 0
  return entry.base_armor + agi * ARMOR_PER_AGI
}

function primaryDamageBonus(entry: HeroEntry): number | null {
  const key = primaryAttrKey(entry.primary_attr)
  const str = entry.base_str
  const agi = entry.base_agi
  const int = entry.base_int
  if (key === 'str' && typeof str === 'number') {
    return str
  }
  if (key === 'agi' && typeof agi === 'number') {
    return agi
  }
  if (key === 'int' && typeof int === 'number') {
    return int
  }
  if (
    key === 'all' &&
    typeof str === 'number' &&
    typeof agi === 'number' &&
    typeof int === 'number'
  ) {
    return (str + agi + int) * UNIVERSAL_DAMAGE_FACTOR
  }
  return null
}

export function displayDamage(
  entry: HeroEntry | undefined,
): { min: number; max: number } | null {
  if (!entry) {
    return null
  }
  if (
    typeof entry.base_attack_min !== 'number' ||
    typeof entry.base_attack_max !== 'number'
  ) {
    return null
  }
  const bonus = primaryDamageBonus(entry)
  if (bonus == null) {
    return {
      min: entry.base_attack_min,
      max: entry.base_attack_max,
    }
  }
  return {
    min: entry.base_attack_min + bonus,
    max: entry.base_attack_max + bonus,
  }
}

export function displayHealth(
  entry: HeroEntry | undefined,
): { value: number; regen: number } | null {
  if (!entry || typeof entry.base_health !== 'number') {
    return null
  }
  const str = typeof entry.base_str === 'number' ? entry.base_str : 0
  const baseRegen =
    typeof entry.base_health_regen === 'number' ? entry.base_health_regen : 0
  return {
    value: entry.base_health + str * HP_PER_STR,
    regen: baseRegen + str * HP_REGEN_PER_STR,
  }
}

export function displayMana(
  entry: HeroEntry | undefined,
): { value: number; regen: number } | null {
  if (!entry || typeof entry.base_mana !== 'number') {
    return null
  }
  const int = typeof entry.base_int === 'number' ? entry.base_int : 0
  const baseRegen =
    typeof entry.base_mana_regen === 'number' ? entry.base_mana_regen : 0
  return {
    value: entry.base_mana + int * MANA_PER_INT,
    regen: baseRegen + int * MANA_REGEN_PER_INT,
  }
}

/** Role tags only — attack type is separate on the profile. */
export function roleLine(entry: HeroEntry | undefined): string[] {
  if (!entry?.roles?.length) {
    return []
  }
  return [...entry.roles]
}

function attrPair(
  base: number | undefined,
  gain: number | undefined,
): { base: number; gain: number } | null {
  if (typeof base !== 'number') {
    return null
  }
  return { base, gain: typeof gain === 'number' ? gain : 0 }
}

export function winRate(meta: HeroMetaEntry | undefined): number | null {
  if (!meta || meta.pub_pick <= 0) {
    return null
  }
  return meta.pub_win / meta.pub_pick
}

/**
 * 1-based rank by pub_pick descending. Ties: lower id wins (stable).
 */
export function popularityRank(
  byId: Record<string, HeroMetaEntry>,
  heroId: number,
): number | null {
  const target = byId[String(heroId)]
  if (!target) {
    return null
  }
  const ranked = Object.values(byId).sort((a, b) => {
    if (b.pub_pick !== a.pub_pick) {
      return b.pub_pick - a.pub_pick
    }
    return a.id - b.id
  })
  const index = ranked.findIndex((row) => row.id === heroId)
  return index >= 0 ? index + 1 : null
}

export function buildHeroProfile(
  entry: HeroEntry | undefined,
  meta: HeroMetaEntry | undefined = undefined,
  matchLevel: number | null | undefined = null,
  metaIndex: Record<string, HeroMetaEntry> | undefined = undefined,
): HeroProfile | null {
  if (!entry) {
    return null
  }

  const str = attrPair(entry.base_str, entry.str_gain)
  const agi = attrPair(entry.base_agi, entry.agi_gain)
  const int = attrPair(entry.base_int, entry.int_gain)
  const attrs = str && agi && int ? { str, agi, int } : null

  let metaBlock: HeroProfile['meta'] = null
  if (meta) {
    metaBlock = {
      popularityRank: metaIndex ? popularityRank(metaIndex, entry.id) : null,
      winRate: winRate(meta),
      pubPick: meta.pub_pick,
      pubWin: meta.pub_win,
    }
  }

  const level =
    typeof matchLevel === 'number' && Number.isFinite(matchLevel)
      ? matchLevel
      : null

  return {
    id: entry.id,
    name: entry.localized_name,
    img: entry.img,
    icon: entry.icon,
    primaryAttr: entry.primary_attr,
    primaryAttrKey: primaryAttrKey(entry.primary_attr),
    attackType: entry.attack_type?.trim() || null,
    attrs,
    moveSpeed: typeof entry.move_speed === 'number' ? entry.move_speed : null,
    armor: displayArmor(entry),
    damage: displayDamage(entry),
    attackRate:
      typeof entry.attack_rate === 'number' ? entry.attack_rate : null,
    attackRange:
      typeof entry.attack_range === 'number' ? entry.attack_range : null,
    magicResist: typeof entry.base_mr === 'number' ? entry.base_mr : null,
    health: displayHealth(entry),
    mana: displayMana(entry),
    roles: roleLine(entry),
    matchLevel: level,
    meta: metaBlock,
  }
}
