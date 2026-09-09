import { describe, expect, it } from 'vitest'
import {
  FIRE_GAIN_MAX,
  fireGainFromScroll,
  firePositionFromElement,
  isAudioOutputSilenced,
} from '../../app/composables/useScoreAudio'

describe('isAudioOutputSilenced', () => {
  it('silences when the user muted or the tab is hidden', () => {
    expect(isAudioOutputSilenced(false, false)).toBe(false)
    expect(isAudioOutputSilenced(true, false)).toBe(true)
    expect(isAudioOutputSilenced(false, true)).toBe(true)
    expect(isAudioOutputSilenced(true, true)).toBe(true)
  })
})

describe('fireGainFromScroll', () => {
  it('is at peak at the top of the page', () => {
    expect(fireGainFromScroll(0, 900)).toBeCloseTo(FIRE_GAIN_MAX)
  })

  it('falls linearly and is silent after one viewport', () => {
    expect(fireGainFromScroll(450, 900)).toBeCloseTo(FIRE_GAIN_MAX * 0.5)
    expect(fireGainFromScroll(900, 900)).toBe(0)
    expect(fireGainFromScroll(1200, 900)).toBe(0)
  })
})

describe('firePositionFromElement', () => {
  it('moves up in listener space when the hearth sits near the top of the viewport', () => {
    const top = firePositionFromElement(
      'radiant',
      { left: 0, right: 400, top: 40, bottom: 200, width: 400, height: 160 },
      { width: 1440, height: 900 },
    )
    const bottom = firePositionFromElement(
      'radiant',
      { left: 0, right: 400, top: 700, bottom: 860, width: 400, height: 160 },
      { width: 1440, height: 900 },
    )
    expect(top.y).toBeGreaterThan(bottom.y)
    expect(top.x).toBeLessThan(0)
  })

  it('keeps dire on the right', () => {
    const pos = firePositionFromElement('dire', null, {
      width: 1440,
      height: 900,
    })
    expect(pos.x).toBeGreaterThan(0)
  })
})
