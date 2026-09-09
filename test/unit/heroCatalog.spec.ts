import {
  buildHeroMetaSnapshot,
  buildHeroProfile,
  createHeroCatalog,
  displayArmor,
  popularityRank,
  primaryAttrI18nKey,
  primaryAttrIconSrc,
  roleLine,
  winRate,
  type HeroEntry,
  type HeroMetaEntry,
} from '../../shared/match'
import { describe, expect, it } from 'vitest'

const invoker: HeroEntry = {
  id: 74,
  name: 'npc_dota_hero_invoker',
  localized_name: 'Invoker',
  img: '/apps/dota2/images/dota_react/heroes/invoker.png?',
  primary_attr: 'int',
  attack_type: 'Ranged',
  roles: ['Carry', 'Nuker', 'Disabler', 'Escape', 'Pusher'],
  base_str: 19,
  base_agi: 14,
  base_int: 20,
  str_gain: 2.5,
  agi_gain: 2,
  int_gain: 4,
  move_speed: 285,
  base_armor: -1,
  base_health: 120,
  base_health_regen: 0.25,
  base_mana: 75,
  base_mana_regen: 0,
  base_attack_min: 29,
  base_attack_max: 35,
  attack_rate: 1.7,
  attack_range: 600,
  base_mr: 25,
}

describe('heroCatalog', () => {
  it('looks up by id', () => {
    const catalog = createHeroCatalog({ '74': invoker })
    expect(catalog.getById(74)?.localized_name).toBe('Invoker')
    expect(catalog.getById(1)).toBeUndefined()
  })

  it('computes display armor from base + agi', () => {
    // -1 + 14/6 ≈ 1.333...
    expect(displayArmor(invoker)).toBeCloseTo(-1 + 14 / 6, 5)
  })

  it('builds role line without attack type', () => {
    expect(roleLine(invoker)).toEqual([
      'Carry',
      'Nuker',
      'Disabler',
      'Escape',
      'Pusher',
    ])
  })

  it('maps primary attr to i18n key', () => {
    expect(primaryAttrI18nKey('int')).toBe('heroHover.primary.int')
    expect(primaryAttrI18nKey('unknown')).toBeUndefined()
  })

  it('maps primary attr to local icon path', () => {
    expect(primaryAttrIconSrc('agi')).toBe('/images/dota2/hero_agi.png')
    expect(primaryAttrIconSrc('str')).toBe('/images/dota2/hero_str.png')
    expect(primaryAttrIconSrc('int')).toBe('/images/dota2/hero_int.png')
    expect(primaryAttrIconSrc('all')).toBe('/images/dota2/hero_all.png')
    expect(primaryAttrIconSrc('unknown')).toBeUndefined()
  })

  it('computes win rate and popularity rank', () => {
    const byId: Record<string, HeroMetaEntry> = {
      '1': { id: 1, pub_pick: 100, pub_win: 50 },
      '74': { id: 74, pub_pick: 700, pub_win: 355 },
      '2': { id: 2, pub_pick: 500, pub_win: 250 },
    }
    expect(winRate(byId['74'])).toBeCloseTo(355 / 700, 5)
    expect(popularityRank(byId, 74)).toBe(1)
    expect(popularityRank(byId, 2)).toBe(2)
    expect(popularityRank(byId, 1)).toBe(3)
  })

  it('builds a full profile view-model', () => {
    const meta: HeroMetaEntry = { id: 74, pub_pick: 700, pub_win: 355 }
    const byId = { '74': meta }
    const profile = buildHeroProfile(invoker, meta, 25, byId)
    expect(profile).toMatchObject({
      id: 74,
      name: 'Invoker',
      primaryAttrKey: 'int',
      attackType: 'Ranged',
      moveSpeed: 285,
      matchLevel: 25,
      attackRate: 1.7,
      attackRange: 600,
      magicResist: 25,
      roles: expect.arrayContaining(['Carry']),
      meta: {
        popularityRank: 1,
        pubPick: 700,
        pubWin: 355,
      },
    })
    expect(profile?.roles).not.toContain('Ranged')
    expect(profile?.attrs?.int).toEqual({ base: 20, gain: 4 })
    expect(profile?.meta?.winRate).toBeCloseTo(355 / 700, 5)
    expect(profile?.armor).toBeCloseTo(-1 + 14 / 6, 5)
    expect(profile?.damage).toEqual({ min: 49, max: 55 })
    expect(profile?.health?.value).toBe(120 + 19 * 22)
    expect(profile?.mana?.value).toBe(75 + 20 * 12)
  })
})

describe('heroMeta', () => {
  it('normalizes heroStats rows into a snapshot', () => {
    const snap = buildHeroMetaSnapshot([
      { id: 74, pub_pick: 10, pub_win: 4 },
      { id: 1, '1_pick': 3, '1_win': 1, '2_pick': 2, '2_win': 1 },
    ])
    expect(snap.byId['74']).toEqual({ id: 74, pub_pick: 10, pub_win: 4 })
    expect(snap.byId['1']).toEqual({ id: 1, pub_pick: 5, pub_win: 2 })
  })
})
