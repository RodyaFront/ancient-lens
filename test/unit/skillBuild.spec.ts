import { describe, expect, it } from 'vitest'
import {
  MAX_SKILL_COLUMNS,
  skillColumnCount,
  upgradeAtLevel,
} from '../../shared/match/skillBuild'

describe('skillColumnCount', () => {
  it('returns 0 when no player has upgrades', () => {
    expect(skillColumnCount([])).toBe(0)
    expect(skillColumnCount([{}, { ability_upgrades_arr: undefined }])).toBe(0)
  })

  it('uses the longest upgrade array across players', () => {
    expect(
      skillColumnCount([
        { ability_upgrades_arr: [1, 2, 3] },
        { ability_upgrades_arr: [4, 5] },
        {},
      ]),
    ).toBe(3)
  })

  it('caps at MAX_SKILL_COLUMNS', () => {
    const long = Array.from({ length: MAX_SKILL_COLUMNS + 5 }, (_, i) => i + 1)
    expect(skillColumnCount([{ ability_upgrades_arr: long }])).toBe(
      MAX_SKILL_COLUMNS,
    )
  })
})

describe('upgradeAtLevel', () => {
  const player = {
    ability_upgrades_arr: [5341, 5340, 5339],
  }

  it('maps level 1 to index 0', () => {
    expect(upgradeAtLevel(player, 1)).toBe(5341)
    expect(upgradeAtLevel(player, 3)).toBe(5339)
  })

  it('returns undefined for missing levels and bad input', () => {
    expect(upgradeAtLevel(player, 4)).toBeUndefined()
    expect(upgradeAtLevel({}, 1)).toBeUndefined()
    expect(upgradeAtLevel(player, 0)).toBeUndefined()
    expect(upgradeAtLevel(player, 1.5)).toBeUndefined()
  })
})
