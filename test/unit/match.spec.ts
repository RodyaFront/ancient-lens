import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  duration,
  kda,
  parseMatchId,
  radiant,
  total,
  validateMatch,
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
    expect(() => validateMatch(match, '1')).toThrow()
  })
})
