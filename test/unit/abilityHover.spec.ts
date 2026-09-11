import { describe, expect, it } from 'vitest'
import { skillRankAtLevel } from '../../shared/match/skillBuild'
import {
  abilityAttribRows,
  abilityBehaviorLabel,
  cleanAbilityName,
  formatLevelValueSegments,
  joinLevelValues,
} from '../../app/utils/abilityHover'

describe('cleanAbilityName', () => {
  it('strips OpenDota talent placeholders', () => {
    expect(
      cleanAbilityName(
        '+{s:bonus_burn_damage_pct}% Infernal Blade Max HP As Damage',
      ),
    ).toBe('+% Infernal Blade Max HP As Damage')
  })

  it('returns empty for missing names', () => {
    expect(cleanAbilityName(undefined)).toBe('')
  })
})

describe('level value formatting', () => {
  it('joins levels with slashes', () => {
    expect(joinLevelValues(['300', '475', '650'])).toBe('300 / 475 / 650')
  })

  it('marks the active skill rank', () => {
    const segments = formatLevelValueSegments(['300', '475', '650'], 2)
    expect(segments.map((part) => part.text).join('')).toBe('300 / 475 / 650')
    expect(segments.find((part) => part.text === '475')?.active).toBe(true)
    expect(segments.find((part) => part.text === '300')?.active).toBe(false)
  })

  it('clamps rank past the last value', () => {
    const segments = formatLevelValueSegments(['10', '20'], 5)
    expect(segments.find((part) => part.text === '20')?.active).toBe(true)
  })
})

describe('abilityAttribRows', () => {
  it('skips generated rows when real attribs exist', () => {
    const rows = abilityAttribRows(
      {
        id: 1,
        name: 'test',
        attrib: [
          {
            header: 'DAMAGE:',
            value: ['100', '200'],
          },
          {
            header: 'CAST TIME:',
            value: ['0.4'],
            generated: true,
          },
        ],
      },
      1,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.label).toBe('DAMAGE')
  })
})

describe('abilityBehaviorLabel', () => {
  it('joins behavior tags', () => {
    expect(
      abilityBehaviorLabel({
        id: 1,
        name: 'x',
        behavior: ['No Target', 'Instant Cast'],
      }),
    ).toBe('No Target, Instant Cast')
  })
})

describe('skillRankAtLevel', () => {
  const player = {
    ability_upgrades_arr: [10, 20, 10, 20, 10, 30],
  }

  it('counts prior picks of the same ability', () => {
    expect(skillRankAtLevel(player, 1)).toBe(1)
    expect(skillRankAtLevel(player, 3)).toBe(2)
    expect(skillRankAtLevel(player, 5)).toBe(3)
    expect(skillRankAtLevel(player, 6)).toBe(1)
  })
})
