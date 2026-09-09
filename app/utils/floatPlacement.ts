export type FloatPlacementOptions = {
  gap?: number
  preferAboveMin?: number
  padX?: number
}

/**
 * Anchor a fixed float to a trigger rect without putting motion transforms
 * on the same node. Offset is applied via `--ui-float-ox` / `--ui-float-oy`
 * so enter/leave can animate a child surface independently.
 */
export function computeFloatPlacement(
  rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  viewport: Pick<Window, 'innerWidth'> | { width: number },
  options: FloatPlacementOptions = {},
): Record<string, string> {
  const gap = options.gap ?? 8
  const preferAboveMin = options.preferAboveMin ?? 40
  const padX = options.padX ?? 12
  const viewportWidth =
    'innerWidth' in viewport ? viewport.innerWidth : viewport.width
  const preferAbove = rect.top > preferAboveMin
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, padX),
    viewportWidth - padX,
  )

  return {
    left: `${left}px`,
    top: preferAbove ? `${rect.top - gap}px` : `${rect.bottom + gap}px`,
    '--ui-float-ox': '-50%',
    '--ui-float-oy': preferAbove ? '-100%' : '0%',
  }
}
