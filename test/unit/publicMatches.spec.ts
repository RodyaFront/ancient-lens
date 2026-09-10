import { describe, expect, it } from 'vitest'
import {
  clusterRegionId,
  isUsablePublicMatch,
  type PublicMatchSummary,
} from '../../shared/match/publicMatches'

describe('publicMatches helpers', () => {
  it('maps known clusters to region ids', () => {
    expect(clusterRegionId(272)).toBe(8)
    expect(clusterRegionId(415)).toBe(5)
    expect(clusterRegionId(141)).toBe(19)
    expect(clusterRegionId(99999)).toBeNull()
  })

  it('rejects incomplete public rows', () => {
    const incomplete: PublicMatchSummary = {
      match_id: 1,
      duration: 0,
      radiant_team: [0, 0, 0, 0, 0],
      dire_team: [0, 0, 0, 0, 0],
    }
    expect(isUsablePublicMatch(incomplete)).toBe(false)
  })

  it('accepts completed rows with heroes', () => {
    const row: PublicMatchSummary = {
      match_id: 2,
      duration: 1800,
      radiant_team: [1, 2, 3, 4, 5],
      dire_team: [6, 7, 8, 9, 10],
    }
    expect(isUsablePublicMatch(row)).toBe(true)
  })
})
