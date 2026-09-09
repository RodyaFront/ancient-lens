import { describe, expect, it } from 'vitest'
import { computeFloatPlacement } from '../../app/utils/floatPlacement'

describe('computeFloatPlacement', () => {
  it('anchors above when there is room and centers with clamp', () => {
    const style = computeFloatPlacement(
      { top: 200, bottom: 228, left: 100, width: 40 },
      { width: 800 },
      { preferAboveMin: 40, gap: 8, padX: 12 },
    )

    expect(style.top).toBe('192px')
    expect(style.left).toBe('120px')
    expect(style['--ui-float-ox']).toBe('-50%')
    expect(style['--ui-float-oy']).toBe('-100%')
  })

  it('anchors below near the top edge', () => {
    const style = computeFloatPlacement(
      { top: 20, bottom: 48, left: 10, width: 20 },
      { width: 400 },
      { preferAboveMin: 40, gap: 8, padX: 12 },
    )

    expect(style.top).toBe('56px')
    expect(style['--ui-float-oy']).toBe('0%')
    expect(style.left).toBe('20px')
  })
})
