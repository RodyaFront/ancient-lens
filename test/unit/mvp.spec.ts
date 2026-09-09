import {
  pickMatchMvp,
  matchMvpScore,
  type MatchPlayer,
} from '../../shared/match'
import { describe, expect, it } from 'vitest'

/** Snapshot of match 8989932772 (Dire win) — unparsed basic fields. */
function players8989932772(): MatchPlayer[] {
  return [
    {
      hero_id: 85,
      personaname: '123',
      player_slot: 0,
      kills: 1,
      deaths: 12,
      assists: 3,
      net_worth: 10510,
      gold_per_min: 325,
      hero_damage: 17690,
      tower_damage: 0,
      hero_healing: 0,
    },
    {
      hero_id: 74,
      personaname: 'Voker',
      player_slot: 1,
      kills: 10,
      deaths: 6,
      assists: 4,
      net_worth: 14948,
      gold_per_min: 447,
      hero_damage: 27478,
      tower_damage: 4181,
      hero_healing: 0,
    },
    {
      hero_id: 30,
      personaname: 'Teotale',
      player_slot: 2,
      kills: 3,
      deaths: 6,
      assists: 3,
      net_worth: 6734,
      gold_per_min: 214,
      hero_damage: 15016,
      tower_damage: 0,
      hero_healing: 6563,
    },
    {
      hero_id: 10,
      personaname: 'morph',
      player_slot: 3,
      kills: 3,
      deaths: 4,
      assists: 5,
      net_worth: 20872,
      gold_per_min: 660,
      hero_damage: 28943,
      tower_damage: 1477,
      hero_healing: 248,
    },
    {
      hero_id: 26,
      personaname: 'mishka_',
      player_slot: 4,
      kills: 3,
      deaths: 9,
      assists: 3,
      net_worth: 8965,
      gold_per_min: 274,
      hero_damage: 8501,
      tower_damage: 0,
      hero_healing: 0,
    },
    {
      hero_id: 76,
      personaname: 'King',
      player_slot: 128,
      kills: 6,
      deaths: 7,
      assists: 7,
      net_worth: 16855,
      gold_per_min: 469,
      hero_damage: 21329,
      tower_damage: 3948,
      hero_healing: 0,
    },
    {
      hero_id: 112,
      personaname: 'dog house',
      player_slot: 129,
      kills: 3,
      deaths: 5,
      assists: 14,
      net_worth: 13669,
      gold_per_min: 336,
      hero_damage: 18930,
      tower_damage: 426,
      hero_healing: 6249,
    },
    {
      hero_id: 80,
      personaname: 'smkr',
      player_slot: 130,
      kills: 13,
      deaths: 1,
      assists: 5,
      net_worth: 32615,
      gold_per_min: 874,
      hero_damage: 24192,
      tower_damage: 25593,
      hero_healing: 0,
    },
    {
      hero_id: 104,
      personaname: 'Harlekin',
      player_slot: 131,
      kills: 9,
      deaths: 3,
      assists: 9,
      net_worth: 18520,
      gold_per_min: 518,
      hero_damage: 11952,
      tower_damage: 631,
      hero_healing: 795,
    },
    {
      hero_id: 101,
      personaname: 'lufti',
      player_slot: 132,
      kills: 5,
      deaths: 4,
      assists: 21,
      net_worth: 12727,
      gold_per_min: 383,
      hero_damage: 17504,
      tower_damage: 667,
      hero_healing: 0,
    },
  ]
}

describe('pickMatchMvp', () => {
  it('returns null when radiant_win is unknown', () => {
    expect(pickMatchMvp({ radiant_win: undefined }, players8989932772())).toBe(
      null,
    )
  })

  it('picks Lone Druid for Dire win on match 8989932772', () => {
    const mvp = pickMatchMvp({ radiant_win: false }, players8989932772())
    expect(mvp?.hero_id).toBe(80)
    expect(mvp?.personaname).toBe('smkr')
  })

  it('scores Lone Druid above Skywrath and Legion among winners', () => {
    const list = players8989932772()
    const ld = list.find((p) => p.hero_id === 80)!
    const sky = list.find((p) => p.hero_id === 101)!
    const lc = list.find((p) => p.hero_id === 104)!
    expect(matchMvpScore(ld)).toBeGreaterThan(matchMvpScore(sky))
    expect(matchMvpScore(ld)).toBeGreaterThan(matchMvpScore(lc))
  })

  it('only considers the winning side', () => {
    const morph = players8989932772().find((p) => p.hero_id === 10)!
    const ld = players8989932772().find((p) => p.hero_id === 80)!
    // Morph has strong farm but lost — must not beat Dire MVP selection.
    expect(matchMvpScore(morph)).toBeLessThan(matchMvpScore(ld))
    const mvp = pickMatchMvp({ radiant_win: false }, players8989932772())
    expect(mvp?.player_slot).toBeGreaterThanOrEqual(128)
  })
})
