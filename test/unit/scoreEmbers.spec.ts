import { describe, expect, it } from 'vitest'
import {
  SCORE_EMBERS_FLAME_COUNT,
  SCORE_EMBERS_HEARTH_MIN_X,
  SCORE_EMBERS_HEARTH_WIDTH,
  SCORE_EMBERS_INTRO_DELAY,
  SCORE_EMBERS_INTRO_FADE,
  SCORE_EMBERS_SPARK_COUNT,
  fillHearth,
  scoreEmbersIntroFade,
  scoreEmbersWinnerUniform,
} from '../../app/utils/scoreEmbers'

function layout(kind: 0 | 1, count: number, offset = 0) {
  const origins = new Float32Array((offset + count) * 3)
  const velocities = new Float32Array((offset + count) * 3)
  const delays = new Float32Array(offset + count)
  const sizes = new Float32Array(offset + count)
  const seeds = new Float32Array(offset + count)
  const lives = new Float32Array(offset + count)
  const kinds = new Float32Array(offset + count)
  fillHearth(
    kind,
    count,
    origins,
    velocities,
    delays,
    sizes,
    seeds,
    lives,
    kinds,
    offset,
  )
  return { origins, velocities, sizes, kinds }
}

describe('winner-only ambient fire', () => {
  it('seeds the campfire in the left team column only', () => {
    const flames = layout(0, SCORE_EMBERS_FLAME_COUNT)
    const sparks = layout(1, SCORE_EMBERS_SPARK_COUNT)
    const maxX = SCORE_EMBERS_HEARTH_MIN_X + SCORE_EMBERS_HEARTH_WIDTH

    for (const pack of [flames, sparks]) {
      for (let index = 0; index < pack.origins.length / 3; index++) {
        const x = pack.origins[index * 3]
        expect(x).toBeGreaterThanOrEqual(SCORE_EMBERS_HEARTH_MIN_X)
        expect(x).toBeLessThan(maxX)
        expect(x).toBeLessThan(0)
      }
    }
  })

  it('mirrors that column onto the winner via the shader uniform', () => {
    expect(scoreEmbersWinnerUniform('radiant')).toBe(0)
    expect(scoreEmbersWinnerUniform('dire')).toBe(1)
  })

  it('stays dark until the score is already on screen', () => {
    expect(scoreEmbersIntroFade(0)).toBe(0)
    expect(scoreEmbersIntroFade(SCORE_EMBERS_INTRO_DELAY)).toBe(0)
    expect(
      scoreEmbersIntroFade(
        SCORE_EMBERS_INTRO_DELAY + SCORE_EMBERS_INTRO_FADE / 2,
      ),
    ).toBeCloseTo(0.5, 5)
    expect(
      scoreEmbersIntroFade(SCORE_EMBERS_INTRO_DELAY + SCORE_EMBERS_INTRO_FADE),
    ).toBe(1)
  })

  it('uses rounder slower flames under faster sparks in the same hearth', () => {
    const flames = layout(0, SCORE_EMBERS_FLAME_COUNT)
    const sparks = layout(1, SCORE_EMBERS_SPARK_COUNT)
    const flameLift = flames.velocities[1]
    const sparkLift = sparks.velocities[1]
    expect(sparkLift).toBeGreaterThan(flameLift)
    expect(Math.max(...flames.sizes)).toBeGreaterThan(Math.max(...sparks.sizes))
    expect(flames.kinds[0]).toBe(0)
    expect(sparks.kinds[0]).toBe(1)
  })
})
