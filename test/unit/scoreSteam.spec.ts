import { describe, expect, it } from 'vitest'
import {
  SCORE_EMBERS_INTRO_DELAY,
  SCORE_EMBERS_INTRO_FADE,
} from '../../app/utils/scoreEmbers'
import {
  SCORE_STEAM_INTRO_DELAY,
  SCORE_STEAM_INTRO_FADE,
  SCORE_STEAM_PRESSURE_ITERATIONS,
  SCORE_STEAM_SIM_SIZE,
  scoreSteamInjectUv,
  scoreSteamIntroFade,
  scoreSteamWinnerUniform,
} from '../../app/utils/scoreSteam'

describe('score steam fluid helpers', () => {
  it('keeps a 256 sim grid and pressure iterations for the poke pass', () => {
    expect(SCORE_STEAM_SIM_SIZE).toBe(256)
    expect(SCORE_STEAM_PRESSURE_ITERATIONS).toBe(16)
  })

  it('mirrors inject UV onto the winner bottom corner', () => {
    expect(scoreSteamInjectUv('radiant')).toEqual({ x: 0.08, y: 0.08 })
    expect(scoreSteamInjectUv('dire')).toEqual({ x: 0.92, y: 0.08 })
  })

  it('reuses hearth intro fade timing so reveal rhythm stays familiar', () => {
    expect(SCORE_STEAM_INTRO_DELAY).toBe(SCORE_EMBERS_INTRO_DELAY)
    expect(SCORE_STEAM_INTRO_FADE).toBe(SCORE_EMBERS_INTRO_FADE)
    expect(scoreSteamWinnerUniform('radiant')).toBe(0)
    expect(scoreSteamWinnerUniform('dire')).toBe(1)
    expect(scoreSteamIntroFade(0)).toBe(0)
    expect(scoreSteamIntroFade(SCORE_STEAM_INTRO_DELAY)).toBe(0)
    expect(
      scoreSteamIntroFade(SCORE_STEAM_INTRO_DELAY + SCORE_STEAM_INTRO_FADE / 2),
    ).toBeCloseTo(0.5, 5)
    expect(
      scoreSteamIntroFade(SCORE_STEAM_INTRO_DELAY + SCORE_STEAM_INTRO_FADE),
    ).toBe(1)
  })
})
