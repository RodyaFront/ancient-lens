import { describe, expect, it } from 'vitest'
import { heroSlots } from '../../shared/match/publicMatches'

describe('heroSlots', () => {
  it('pads short teams to five nulls', () => {
    expect(heroSlots([1, 2])).toEqual([1, 2, null, null, null])
  })

  it('trims teams longer than five', () => {
    expect(heroSlots([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5])
  })

  it('drops invalid ids and pads', () => {
    expect(heroSlots([0, -1, 7])).toEqual([7, null, null, null, null])
  })

  it('handles missing arrays', () => {
    expect(heroSlots(undefined)).toEqual([null, null, null, null, null])
  })
})
