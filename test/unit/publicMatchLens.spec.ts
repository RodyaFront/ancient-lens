import { describe, expect, it } from 'vitest'
import {
  buildPublicMatchBatchLens,
  matchPassesFacet,
  parseRankTier,
  rankTierIconSrc,
  type PublicMatchSummary,
} from '../../shared/match/publicMatchLens'

describe('parseRankTier', () => {
  it('decodes medal and stars', () => {
    expect(parseRankTier(45)).toEqual({
      medal: 'archon',
      stars: 5,
      raw: 45,
    })
    expect(parseRankTier(80)?.medal).toBe('immortal')
    expect(parseRankTier(9)).toBeNull()
  })

  it('maps medal to local icon path', () => {
    expect(rankTierIconSrc(45)).toBe('/images/dota2/rank_icons/rank_icon_4.png')
    expect(rankTierIconSrc(80)).toBe('/images/dota2/rank_icons/rank_icon_8.png')
    expect(rankTierIconSrc(null)).toBeNull()
  })
})

describe('public match lens', () => {
  const sample: PublicMatchSummary[] = [
    {
      match_id: 1,
      duration: 1800,
      radiant_win: true,
      lobby_type: 7,
      game_mode: 22,
      avg_rank_tier: 45,
    },
    {
      match_id: 2,
      duration: 3600,
      radiant_win: false,
      lobby_type: 0,
      game_mode: 23,
    },
    {
      match_id: 3,
      duration: 600,
      radiant_win: true,
      lobby_type: 0,
      game_mode: 23,
    },
  ]

  it('builds honest batch tallies', () => {
    const lens = buildPublicMatchBatchLens(sample)
    expect(lens.total).toBe(3)
    expect(lens.radiantWins).toBe(2)
    expect(lens.direWins).toBe(1)
    expect(lens.ranked).toBe(1)
    expect(lens.turbo).toBe(2)
    expect(lens.withRank).toBe(1)
    expect(lens.medianDuration).toBe(1800)
  })

  it('filters facets', () => {
    expect(sample.filter((row) => matchPassesFacet(row, 'turbo'))).toHaveLength(
      2,
    )
    expect(sample.filter((row) => matchPassesFacet(row, 'long'))).toHaveLength(
      1,
    )
    expect(
      sample.filter((row) => matchPassesFacet(row, 'ranked')),
    ).toHaveLength(1)
  })
})
