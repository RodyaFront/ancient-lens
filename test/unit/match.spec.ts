import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  duration,
  isMatchBestStat,
  kda,
  killParticipationPercent,
  matchParticipationExtreme,
  matchStatExtreme,
  parseMatchId,
  ParseMatchIdError,
  radiant,
  total,
  upsertRecentMatch,
  validateMatch,
  ValidateMatchError,
  buildPartyMarks,
  toRoman,
} from '../../shared/match'

describe('parseMatchId', () => {
  it('accepts IDs and supported match URLs without accepting unrelated hosts', () => {
    for (const input of [
      '8961419173',
      ' https://www.dotabuff.com/matches/8961419173 ',
      'https://ru.dotabuff.com/matches/8961419173/builds',
      'opendota.com/matches/8961419173?x=1',
      '0008961419173',
    ]) {
      expect(parseMatchId(input)).toBe('8961419173')
    }

    for (const input of [
      '',
      '0',
      '-1',
      '9007199254740992',
      'https://dotabuff.com.evil.test/matches/123',
      'https://evil.test/matches/123',
      'https://www.dotabuff.com/players/123',
      'https://u:p@dotabuff.com/matches/123',
      'javascript:alert(1)',
    ]) {
      expect(() => parseMatchId(input)).toThrow()
    }
  })

  it('rejects bare tokens with the generic ID/link message', () => {
    for (const input of ['abc', 'not-a-url', 'google.com']) {
      try {
        parseMatchId(input)
        expect.fail('expected ParseMatchIdError')
      } catch (error) {
        expect(error).toBeInstanceOf(ParseMatchIdError)
        expect((error as ParseMatchIdError).code).toBe('generic')
      }
    }
  })

  it('still rejects unsupported hosts when the value looks like a URL', () => {
    try {
      parseMatchId('evil.test/matches/123')
      expect.fail('expected ParseMatchIdError')
    } catch (error) {
      expect(error).toBeInstanceOf(ParseMatchIdError)
      expect((error as ParseMatchIdError).code).toBe('host')
    }
  })
})

describe('upsertRecentMatch', () => {
  it('prepends, dedupes, and caps the list', () => {
    const first = { id: '1', openedAt: 1 }
    const second = { id: '2', openedAt: 2 }
    const again = { id: '1', openedAt: 3 }

    expect(upsertRecentMatch([], first, 8)).toEqual([first])
    expect(upsertRecentMatch([first], second, 8)).toEqual([second, first])
    expect(upsertRecentMatch([second, first], again, 8)).toEqual([
      again,
      second,
    ])
    expect(
      upsertRecentMatch([second, first], { id: '3', openedAt: 4 }, 2),
    ).toEqual([{ id: '3', openedAt: 4 }, second])
  })

  it('ignores invalid ids', () => {
    expect(upsertRecentMatch([{ id: '1' }], { id: 'abc' }, 8)).toEqual([
      { id: '1' },
    ])
  })
})

describe('match best stats', () => {
  it('marks all tied leaders and treats deaths as a minimum', () => {
    const players = [
      { kills: 10, deaths: 2, assists: 5, hero_healing: 0 },
      { kills: 10, deaths: 0, assists: 3, hero_healing: 0 },
      { kills: 4, deaths: 0, assists: 5, hero_healing: 120 },
    ]

    expect(matchStatExtreme(players, 'kills')).toBe(10)
    expect(isMatchBestStat(10, 10, 'max')).toBe(true)
    expect(isMatchBestStat(4, 10, 'max')).toBe(false)

    expect(matchStatExtreme(players, 'deaths')).toBe(0)
    expect(isMatchBestStat(0, 0, 'min')).toBe(true)
    expect(isMatchBestStat(2, 0, 'min')).toBe(false)

    expect(matchStatExtreme(players, 'assists')).toBe(5)
    expect(isMatchBestStat(5, 5, 'max')).toBe(true)

    expect(matchStatExtreme(players, 'hero_healing')).toBe(120)
    expect(isMatchBestStat(0, 0, 'max')).toBe(false)
    expect(isMatchBestStat(120, 120, 'max')).toBe(true)
  })

  it('computes kill participation extremes with ties', () => {
    const players = [
      { kills: 5, assists: 5, isRadiant: true },
      { kills: 8, assists: 2, isRadiant: true },
      { kills: 3, assists: 1, isRadiant: false },
    ]
    const teamKills = (player: { isRadiant?: boolean }) =>
      player.isRadiant ? 10 : 4

    expect(killParticipationPercent(players[0]!, 10)).toBe(100)
    expect(killParticipationPercent(players[1]!, 10)).toBe(100)
    expect(matchParticipationExtreme(players, teamKills)).toBe(100)
    expect(isMatchBestStat(100, 100, 'max')).toBe(true)
    expect(
      isMatchBestStat(100, matchParticipationExtreme(players, teamKills)),
    ).toBe(true)
  })
})

describe('missing values', () => {
  it('remain missing while genuine zero remains zero', () => {
    expect(total([{ kills: 0 }, { kills: 0 }], 'kills')).toBe(0)
    expect(total([{ kills: 2 }, {}], 'kills')).toBeNull()
    expect(total([], 'kills')).toBeNull()
    expect(duration(null)).toBe('—')
    expect(duration(0)).toBe('0:00')
    expect(kda({ kills: 20, deaths: 0, assists: 4 })).toBe(24)
  })
})

describe('party marks', () => {
  it('numbers multi-player parties by first appearance and skips solos', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(3)).toBe('III')

    const marks = buildPartyMarks([
      { party_id: 10, player_slot: 0 },
      { party_id: 10, player_slot: 1 },
      { party_id: 20, player_slot: 2 },
      { party_id: 30, player_slot: 128 },
      { party_id: 30, player_slot: 129 },
      { party_id: 30, player_slot: 130 },
    ])

    expect(marks.map((mark) => mark?.roman ?? null)).toEqual([
      'I',
      'I',
      null,
      'II',
      'II',
      'II',
    ])
    expect(marks[0]?.size).toBe(2)
    expect(marks[3]?.size).toBe(3)
  })

  it('does not paint a whole-lobby party_id (practice / 10-stack)', () => {
    const marks = buildPartyMarks(
      Array.from({ length: 10 }, (_, slot) => ({
        party_id: 0,
        party_size: 10,
        player_slot: slot < 5 ? slot : slot + 123,
      })),
    )
    expect(marks.every((mark) => mark === null)).toBe(true)
  })

  it('still paints two 5-stacks in the same match', () => {
    const marks = buildPartyMarks([
      { party_id: 1, player_slot: 0 },
      { party_id: 1, player_slot: 1 },
      { party_id: 1, player_slot: 2 },
      { party_id: 1, player_slot: 3 },
      { party_id: 1, player_slot: 4 },
      { party_id: 2, player_slot: 128 },
      { party_id: 2, player_slot: 129 },
      { party_id: 2, player_slot: 130 },
      { party_id: 2, player_slot: 131 },
      { party_id: 2, player_slot: 132 },
    ])
    expect(marks.map((mark) => mark?.roman ?? null)).toEqual([
      'I',
      'I',
      'I',
      'I',
      'I',
      'II',
      'II',
      'II',
      'II',
      'II',
    ])
  })
})

describe('verified OpenDota match', () => {
  it('renders canonical facts', () => {
    const matchPath = fileURLToPath(
      new URL('../../public/data/match-8961419173.json', import.meta.url),
    )
    const match = JSON.parse(readFileSync(matchPath, 'utf8'))
    validateMatch(match, '8961419173')
    expect(match.players.length).toBe(10)
    expect(match.radiant_win).toBe(true)
    expect(duration(match.duration)).toBe('23:52')
    expect(total(match.players.filter(radiant), 'kills')).toBe(48)
    expect(
      total(
        match.players.filter((player) => !radiant(player)),
        'kills',
      ),
    ).toBe(7)
    expect(total(match.players.filter(radiant), 'net_worth')).toBe(61470)
    expect(
      total(
        match.players.filter((player) => !radiant(player)),
        'net_worth',
      ),
    ).toBe(28467)
    expect(() => validateMatch(match, '1')).toThrow(ValidateMatchError)
    try {
      validateMatch(match, '1')
      expect.fail('expected ValidateMatchError')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidateMatchError)
      expect((error as ValidateMatchError).code).toBe('mismatch')
    }
  })
})
