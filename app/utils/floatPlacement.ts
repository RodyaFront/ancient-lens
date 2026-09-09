export type FloatPlacementOptions = {
  gap?: number
  preferAboveMin?: number
  padX?: number
  padY?: number
}

export type FloatRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>

export type FloatViewport = {
  width: number
  height: number
}

export type FloatTipSize = {
  width: number
  height: number
}

/**
 * Anchor a fixed float to a trigger rect without percentage `transform`
 * offsets on the shell. Percentage translates on `position: fixed` expand
 * document scrollable overflow (tip “exists” but sits outside the viewport
 * while the page scrollbar grows).
 *
 * Vertical/horizontal clamping uses measured tip size when available.
 * Motion (enter/leave) stays on a child surface via `.ui-float__surface`.
 */
export function computeFloatPlacement(
  rect: FloatRect,
  viewport: FloatViewport | Pick<Window, 'innerWidth' | 'innerHeight'>,
  tipSize: FloatTipSize | null | undefined = null,
  options: FloatPlacementOptions = {},
): Record<string, string> {
  const gap = options.gap ?? 8
  const preferAboveMin = options.preferAboveMin ?? 40
  const padX = options.padX ?? 12
  const padY = options.padY ?? 12
  const viewportWidth =
    'innerWidth' in viewport ? viewport.innerWidth : viewport.width
  const viewportHeight =
    'innerHeight' in viewport ? viewport.innerHeight : viewport.height

  const tipWidth = tipSize?.width ?? 0
  const tipHeight = tipSize?.height ?? 0
  const preferAbove = rect.top > preferAboveMin

  let top: number
  if (tipHeight > 0) {
    const aboveTop = rect.top - gap - tipHeight
    const belowTop = rect.bottom + gap
    if (preferAbove && aboveTop >= padY) {
      top = aboveTop
    } else if (belowTop + tipHeight <= viewportHeight - padY) {
      top = belowTop
    } else if (aboveTop >= padY) {
      top = aboveTop
    } else {
      top = belowTop
    }
    const maxTop = Math.max(padY, viewportHeight - tipHeight - padY)
    top = Math.min(Math.max(top, padY), maxTop)
  } else {
    // First paint before measure: prefer below to avoid off-screen flash.
    top = preferAbove ? rect.top - gap : rect.bottom + gap
  }

  const centerX = rect.left + rect.width / 2
  let left: number
  if (tipWidth > 0) {
    left = centerX - tipWidth / 2
    left = Math.min(
      Math.max(left, padX),
      Math.max(padX, viewportWidth - tipWidth - padX),
    )
  } else {
    left = Math.min(Math.max(centerX, padX), viewportWidth - padX)
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
  }
}
