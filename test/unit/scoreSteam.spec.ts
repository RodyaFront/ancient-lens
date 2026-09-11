import { describe, expect, it } from 'vitest'
import {
  SCORE_EMBERS_INTRO_DELAY,
  SCORE_EMBERS_INTRO_FADE,
} from '../../app/utils/scoreEmbers'
import {
  SCORE_STEAM_DENSITY_LIFE,
  SCORE_STEAM_EMIT_MIN_GAP,
  SCORE_STEAM_EMIT_PERIOD,
  SCORE_STEAM_INTRO_DELAY,
  SCORE_STEAM_INTRO_FADE,
  SCORE_STEAM_PRESSURE_ITERATIONS,
  SCORE_STEAM_SIM_MAX_WIDTH,
  SCORE_STEAM_SIM_SIZE,
  SCORE_STEAM_TUNE_DEFAULTS,
  SCORE_STEAM_VIEW_MARGIN_X,
  SCORE_STEAM_VIEW_MARGIN_Y,
  formatScoreSteamTune,
  scoreSteamDensityDissipation,
  scoreSteamDisplayUv,
  scoreSteamInjectUv,
  scoreSteamIntroFade,
  scoreSteamNextEmitDelay,
  scoreSteamShouldEmit,
  scoreSteamSimExtent,
  scoreSteamWinnerUniform,
} from '../../app/utils/scoreSteam'

describe('score steam fluid helpers', () => {
  it('keeps a 256 sim grid and pressure iterations for the poke pass', () => {
    expect(SCORE_STEAM_SIM_SIZE).toBe(256)
    expect(SCORE_STEAM_PRESSURE_ITERATIONS).toBe(16)
  })

  it('injects off-screen in the sim gutter; dire is a display mirror', () => {
    const inject = scoreSteamInjectUv('radiant')
    expect(inject).toEqual(scoreSteamInjectUv('dire'))
    expect(inject.x).toBeLessThan(SCORE_STEAM_VIEW_MARGIN_X)
    expect(inject.y).toBeLessThan(SCORE_STEAM_VIEW_MARGIN_Y)
  })

  it('emits on the first frame of each background-smoke period', () => {
    expect(SCORE_STEAM_EMIT_PERIOD).toBe(1.5)
    const dt = 0.016
    expect(scoreSteamShouldEmit(0, dt)).toBe(true)
    expect(scoreSteamShouldEmit(0.2, dt)).toBe(false)
    expect(scoreSteamShouldEmit(1.49, dt)).toBe(false)
    expect(scoreSteamShouldEmit(1.505, dt)).toBe(true)
    expect(scoreSteamShouldEmit(-0.1, dt)).toBe(false)
  })

  it('fades density over about 10 seconds regardless of frame rate', () => {
    expect(SCORE_STEAM_DENSITY_LIFE).toBe(10)
    const at60 = scoreSteamDensityDissipation(1 / 60) ** 60
    const at144 = scoreSteamDensityDissipation(1 / 144) ** 144
    expect(at60).toBeCloseTo(at144, 3)
    const afterTen = scoreSteamDensityDissipation(1 / 60) ** 600
    expect(afterTen).toBeCloseTo(0.12, 2)
  })

  it('crops the parent banner so the spawn gutter stays off-screen', () => {
    const radiant = scoreSteamDisplayUv(0, 0, 4, 'radiant')
    const dire = scoreSteamDisplayUv(1, 0, 4, 'dire')
    expect(radiant.x).toBeCloseTo(SCORE_STEAM_VIEW_MARGIN_X)
    expect(radiant.y).toBeCloseTo(SCORE_STEAM_VIEW_MARGIN_Y)
    expect(dire.x).toBeCloseTo(SCORE_STEAM_VIEW_MARGIN_X)
    expect(dire.y).toBeCloseTo(SCORE_STEAM_VIEW_MARGIN_Y)
    expect(scoreSteamDisplayUv(0.5, 0.5, 4, 'radiant').x).toBeCloseTo(
      SCORE_STEAM_VIEW_MARGIN_X + 0.5 * (1 - SCORE_STEAM_VIEW_MARGIN_X),
    )
  })

  it('sizes the fluid grid to the parent aspect', () => {
    expect(scoreSteamSimExtent(1)).toEqual({ width: 256, height: 256 })
    expect(scoreSteamSimExtent(4)).toEqual({
      width: SCORE_STEAM_SIM_MAX_WIDTH,
      height: SCORE_STEAM_SIM_SIZE,
    })
  })

  it('pins the background-smoke preset as the default tune', () => {
    expect(SCORE_STEAM_TUNE_DEFAULTS).toEqual({
      windX: 0.075,
      windY: 0.095,
      windWaver: 0.05,
      buoyancy: 0.15,
      viewMarginX: 0.16,
      viewMarginY: 0.22,
      emitters: [
        {
          injectX: 0.05,
          injectY: 0.06,
          emitPeriod: 1.5,
          emitJitter: 1.05,
          emitVelX: 0.085,
          emitVelY: 0.225,
          emitDensity: 0.15,
          emitRadius: 0.052,
          densityLife: 10,
          displayAlpha: 0.75,
          visible: true,
        },
      ],
    })
    expect(SCORE_STEAM_TUNE_DEFAULTS.emitters[0]?.injectX).toBe(
      scoreSteamInjectUv('radiant').x,
    )
    expect(formatScoreSteamTune()).toContain('score-steam-tune')
    expect(formatScoreSteamTune()).toContain('"emitJitter": 1.05')
    expect(formatScoreSteamTune()).toContain('"windX": 0.075')
  })

  it('spreads the next puff by plus or minus jitter seconds', () => {
    expect(scoreSteamNextEmitDelay(1.5, 0, 0.5)).toBe(1.5)
    expect(scoreSteamNextEmitDelay(1.5, 0.4, 0)).toBeCloseTo(1.1)
    expect(scoreSteamNextEmitDelay(1.5, 0.4, 1)).toBeCloseTo(1.9)
    expect(scoreSteamNextEmitDelay(0.2, 5, 0)).toBe(SCORE_STEAM_EMIT_MIN_GAP)
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
