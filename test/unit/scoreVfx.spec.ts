import { describe, expect, it } from 'vitest'
import {
  SCORE_VFX_DURATION_MS,
  SCORE_VFX_IMPACT_AT,
  SCORE_VFX_IMPACT_END,
  scoreVfxPunch,
  scoreVfxWinnerUniform,
} from '../../app/utils/scoreVfx'

describe('score reveal punch', () => {
  it('lights only the winning side in the overlay uniform', () => {
    expect(scoreVfxWinnerUniform('radiant')).toBe(0)
    expect(scoreVfxWinnerUniform('dire')).toBe(1)
  })

  it('hits in beats: flash, slash, then impact rays', () => {
    const atFlash = scoreVfxPunch(0.12)
    const afterFlash = scoreVfxPunch(0.4)
    expect(atFlash.flash).toBeGreaterThan(afterFlash.flash)
    expect(atFlash.flash).toBeGreaterThan(0.9)

    const scanStart = scoreVfxPunch(0.05)
    const scanMid = scoreVfxPunch(0.2)
    const scanEnd = scoreVfxPunch(0.42)
    expect(scanStart.scan).toBe(0)
    expect(scanMid.scan).toBeGreaterThan(0.5)
    expect(scanEnd.scan).toBe(1)

    const impactStart = scoreVfxPunch(SCORE_VFX_IMPACT_AT)
    const impactMid = scoreVfxPunch(
      (SCORE_VFX_IMPACT_AT + SCORE_VFX_IMPACT_END) / 2,
    )
    const impactEnd = scoreVfxPunch(SCORE_VFX_IMPACT_END)
    expect(impactStart.impact).toBe(0)
    expect(impactMid.impact).toBeCloseTo(0.5, 5)
    expect(impactEnd.impact).toBe(1)
  })

  it('clears the overlay after the punch window', () => {
    expect(scoreVfxPunch(0).fade).toBe(1)
    expect(scoreVfxPunch(1.28).fade).toBe(1)
    expect(scoreVfxPunch(SCORE_VFX_DURATION_MS / 1000).fade).toBe(0)
  })
})
