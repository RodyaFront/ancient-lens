import {
  formatArmorDisplay,
  formatAttrGain,
  formatDamageRange,
  formatOrdinal,
  formatRegen,
  formatWinRatePercent,
} from '../../app/utils/heroFormat'
import { describe, expect, it } from 'vitest'

describe('heroFormat', () => {
  it('formats ordinals', () => {
    expect(formatOrdinal(1)).toBe('1st')
    expect(formatOrdinal(2)).toBe('2nd')
    expect(formatOrdinal(3)).toBe('3rd')
    expect(formatOrdinal(7)).toBe('7th')
    expect(formatOrdinal(11)).toBe('11th')
    expect(formatOrdinal(21)).toBe('21st')
  })

  it('formats win rate and attrs', () => {
    expect(formatWinRatePercent(0.5065)).toBe('50.65%')
    expect(formatAttrGain(22, 4)).toBe('22 +4')
    expect(formatAttrGain(19, 2.5)).toBe('19 +2.5')
    expect(formatArmorDisplay(-1 + 14 / 6)).toBe('1.33')
    expect(formatDamageRange(49, 55)).toBe('49–55')
    expect(formatDamageRange(40, 40)).toBe('40')
    expect(formatRegen(3.7)).toBe('+3.7')
  })
})
