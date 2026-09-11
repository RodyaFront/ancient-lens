import { describe, expect, it } from 'vitest'
import {
  SCORE_EMBERS_COAL_COUNT,
  SCORE_EMBERS_CORNER_ANGLE_DEG,
  SCORE_EMBERS_CORNER_COUNT,
  SCORE_EMBERS_CORNER_Y,
  SCORE_EMBERS_FLAME_COUNT,
  SCORE_EMBERS_HEARTH_MIN_X,
  SCORE_EMBERS_HEARTH_WIDTH,
  SCORE_EMBERS_INTRO_DELAY,
  SCORE_EMBERS_INTRO_FADE,
  SCORE_EMBERS_SPARK_COUNT,
  fillCornerPlume,
  fillHearth,
  scoreEmbersCornerScreenAngleDeg,
  scoreEmbersIntroFade,
  scoreEmbersLocalUvX,
  scoreEmbersWinnerUniform,
} from '../../app/utils/scoreEmbers'

function layout(kind: 0 | 1 | 2, count: number, offset = 0) {
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
  it('seeds all emitters inside the left team column (CP0 box)', () => {
    const coals = layout(0, SCORE_EMBERS_COAL_COUNT)
    const flames = layout(1, SCORE_EMBERS_FLAME_COUNT)
    const sparks = layout(2, SCORE_EMBERS_SPARK_COUNT)
    const maxX = SCORE_EMBERS_HEARTH_MIN_X + SCORE_EMBERS_HEARTH_WIDTH

    for (const pack of [coals, flames, sparks]) {
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

  it('maps both winner corners to local UV origin for the hearth', () => {
    expect(scoreEmbersLocalUvX(0, 'radiant')).toBe(0)
    expect(scoreEmbersLocalUvX(1, 'dire')).toBe(0)
    expect(scoreEmbersLocalUvX(0.25, 'radiant')).toBe(0.25)
    expect(scoreEmbersLocalUvX(0.25, 'dire')).toBeCloseTo(0.75)
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

  it('layers Source-style emitters: coals, flames, then faster sparks', () => {
    const coals = layout(0, SCORE_EMBERS_COAL_COUNT)
    const flames = layout(1, SCORE_EMBERS_FLAME_COUNT)
    const sparks = layout(2, SCORE_EMBERS_SPARK_COUNT)
    expect(sparks.velocities[1]).toBeGreaterThan(flames.velocities[1])
    expect(flames.velocities[1]).toBeGreaterThan(coals.velocities[1])
    expect(Math.max(...coals.sizes)).toBeGreaterThan(Math.max(...sparks.sizes))
    expect(coals.kinds[0]).toBe(0)
    expect(flames.kinds[0]).toBe(1)
    expect(sparks.kinds[0]).toBe(2)
  })

  it('spawns a separate corner plume from the winner corner', () => {
    const origins = new Float32Array(SCORE_EMBERS_CORNER_COUNT * 3)
    const velocities = new Float32Array(SCORE_EMBERS_CORNER_COUNT * 3)
    const delays = new Float32Array(SCORE_EMBERS_CORNER_COUNT)
    const sizes = new Float32Array(SCORE_EMBERS_CORNER_COUNT)
    const seeds = new Float32Array(SCORE_EMBERS_CORNER_COUNT)
    const lives = new Float32Array(SCORE_EMBERS_CORNER_COUNT)
    const kinds = new Float32Array(SCORE_EMBERS_CORNER_COUNT)
    fillCornerPlume(
      SCORE_EMBERS_CORNER_COUNT,
      origins,
      velocities,
      delays,
      sizes,
      seeds,
      lives,
      kinds,
      0,
    )

    for (let index = 0; index < SCORE_EMBERS_CORNER_COUNT; index++) {
      const maxX = SCORE_EMBERS_HEARTH_MIN_X + SCORE_EMBERS_HEARTH_WIDTH
      expect(origins[index * 3]).toBeGreaterThanOrEqual(
        SCORE_EMBERS_HEARTH_MIN_X - 0.001,
      )
      expect(origins[index * 3]).toBeLessThan(maxX + 0.001)
      expect(origins[index * 3 + 1]).toBeGreaterThan(
        SCORE_EMBERS_CORNER_Y - 0.001,
      )
      expect(origins[index * 3 + 1]).toBeLessThan(SCORE_EMBERS_CORNER_Y + 0.7)
      // Speed in vx; angle jitter in vy; heading is winner-aware in the shader.
      expect(velocities[index * 3]).toBeGreaterThan(0.3)
      expect(Math.abs(velocities[index * 3 + 1])).toBeLessThan(15)
      expect(kinds[index]).toBe(3)
      expect(lives[index]).toBeGreaterThan(4.1)
    }
  })

  it('uses mirrored screen angles for radiant vs dire corner plumes', () => {
    expect(SCORE_EMBERS_CORNER_ANGLE_DEG).toBe(85)
    expect(scoreEmbersCornerScreenAngleDeg('radiant')).toBe(85)
    expect(scoreEmbersCornerScreenAngleDeg('dire')).toBe(95)
    expect(scoreEmbersCornerScreenAngleDeg('radiant', 135)).toBe(135)
    expect(scoreEmbersCornerScreenAngleDeg('dire', 135)).toBe(45)
  })
})
