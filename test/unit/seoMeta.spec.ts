import { describe, expect, it } from 'vitest'
import { buildMatchSeoCopy } from '../../shared/match/seoMeta'
import type { MatchData } from '../../shared/match/types'

describe('buildMatchSeoCopy', () => {
  it('builds unique EN title and description from match data', () => {
    const match = {
      match_id: 8990366825,
      radiant_win: false,
      duration: 2218,
      radiant_score: 35,
      dire_score: 33,
      players: [
        { hero_id: 12, player_slot: 0, kills: 1, deaths: 1, assists: 1 },
        { hero_id: 13, player_slot: 128, kills: 2, deaths: 2, assists: 2 },
      ],
    } as MatchData

    const copy = buildMatchSeoCopy(match, {
      matchId: '8990366825',
      locale: 'en',
      heroes: {
        '12': { localized_name: 'Phantom Lancer' },
        '13': { localized_name: 'Puck' },
      },
    })

    expect(copy.title).toContain('8990366825')
    expect(copy.title).toContain('Dire')
    expect(copy.title).toContain('35:33')
    expect(copy.description).toContain('Phantom Lancer')
    expect(copy.description).toContain('Puck')
    expect(copy.description).toContain('Scorebook')
    expect(copy.description).not.toMatch(/OpenDota stats on Ancient Lens/i)
    expect(copy.durationLabel).toBe('36:58')
  })

  it('falls back when match is missing', () => {
    const copy = buildMatchSeoCopy(null, { matchId: '1', locale: 'en' })
    expect(copy.title).toBe('Match #1 | Ancient Lens')
    expect(copy.description.length).toBeGreaterThan(20)
    expect(copy.description).not.toMatch(/OpenDota data/i)
  })
})
