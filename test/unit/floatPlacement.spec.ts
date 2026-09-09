import { describe, expect, it } from 'vitest'
import { computeFloatPlacement } from '../../app/utils/floatPlacement'

describe('computeFloatPlacement', () => {
  it('places above when measured tip fits, and clamps horizontally', () => {
    const style = computeFloatPlacement(
      { top: 200, bottom: 228, left: 300, width: 40 },
      { width: 800, height: 600 },
      { width: 200, height: 120 },
      { preferAboveMin: 40, gap: 8, padX: 12, padY: 12 },
    )

    expect(style.top).toBe('72px') // 200 - 8 - 120
    expect(style.left).toBe('220px') // center 320 - half 100
  })

  it('falls back below when above would clip the top pad', () => {
    const style = computeFloatPlacement(
      { top: 200, bottom: 228, left: 100, width: 40 },
      { width: 800, height: 600 },
      { width: 320, height: 200 },
      { preferAboveMin: 40, gap: 8, padX: 12, padY: 12 },
    )

    // aboveTop = -8 < pad → below fits
    expect(style.top).toBe('236px')
    expect(style.left).toBe('12px') // center 120 - 160 = -40 → pad
  })

  it('places below near the top edge when preferAboveMin is not met', () => {
    const style = computeFloatPlacement(
      { top: 20, bottom: 48, left: 10, width: 20 },
      { width: 400, height: 600 },
      { width: 180, height: 100 },
      { preferAboveMin: 40, gap: 8, padX: 12, padY: 12 },
    )

    expect(style.top).toBe('56px')
    expect(style.left).toBe('12px')
  })

  it('falls back without tip size (no percentage offsets)', () => {
    const style = computeFloatPlacement(
      { top: 20, bottom: 48, left: 10, width: 20 },
      { width: 400, height: 600 },
      null,
      { preferAboveMin: 40, gap: 8, padX: 12 },
    )

    expect(style.top).toBe('56px')
    expect(style.left).toBe('20px')
    expect(style['--ui-float-ox']).toBeUndefined()
    expect(style['--ui-float-oy']).toBeUndefined()
  })
})
