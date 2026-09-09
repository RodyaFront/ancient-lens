import {
  PREVIEW_LEAVE_GRACE_MS,
  PREVIEW_QUIET_MS,
  PREVIEW_REDUCED_QUIET_MS,
  PREVIEW_RING_MS,
} from '~/utils/previewTiming'

export type HeroPreviewPhase = 'quiet' | 'ring' | 'open'

export type HeroPreviewSession = {
  heroId: number
  matchLevel: number | null
  triggerEl: HTMLElement
  phase: HeroPreviewPhase
  sticky: boolean
  cursorX: number
  cursorY: number
}

const stickySession = shallowRef<HeroPreviewSession | null>(null)
const hoverSession = shallowRef<HeroPreviewSession | null>(null)

let quietTimer: ReturnType<typeof setTimeout> | null = null
let ringTimer: ReturnType<typeof setTimeout> | null = null
let leaveTimer: ReturnType<typeof setTimeout> | null = null
let hoverToken = 0

function clearHoverTimers() {
  if (quietTimer) {
    clearTimeout(quietTimer)
    quietTimer = null
  }
  if (ringTimer) {
    clearTimeout(ringTimer)
    ringTimer = null
  }
}

function clearLeaveTimer() {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
}

function prefersReducedMotion() {
  return (
    import.meta.client &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function clearHover() {
  hoverToken += 1
  clearHoverTimers()
  clearLeaveTimer()
  hoverSession.value = null
}

function patchHover(patch: Partial<HeroPreviewSession>) {
  const current = hoverSession.value
  if (!current) {
    return
  }
  hoverSession.value = { ...current, ...patch }
}

/**
 * Two concurrent sessions: one sticky (click-pin) + one armed hover.
 * Leave only clears the hover session.
 */
export function useHeroPreview() {
  const openCards = computed(() => {
    const cards: HeroPreviewSession[] = []
    if (stickySession.value?.phase === 'open') {
      cards.push(stickySession.value)
    }
    if (
      hoverSession.value?.phase === 'open' &&
      hoverSession.value.heroId !== stickySession.value?.heroId
    ) {
      cards.push(hoverSession.value)
    }
    return cards
  })

  const showRing = computed(() => hoverSession.value?.phase === 'ring')
  const ringCursor = computed(() => ({
    x: hoverSession.value?.cursorX ?? 0,
    y: hoverSession.value?.cursorY ?? 0,
  }))

  function dismiss(forId?: number) {
    if (forId === undefined) {
      stickySession.value = null
      clearHover()
      return
    }
    if (stickySession.value?.heroId === forId) {
      stickySession.value = null
    }
    if (hoverSession.value?.heroId === forId) {
      clearHover()
    }
  }

  function dismissSticky() {
    stickySession.value = null
  }

  function leave(forId: number) {
    if (hoverSession.value?.heroId !== forId) {
      return
    }
    clearLeaveTimer()
    leaveTimer = setTimeout(() => {
      leaveTimer = null
      if (hoverSession.value?.heroId === forId) {
        clearHover()
      }
    }, PREVIEW_LEAVE_GRACE_MS)
  }

  /** Keep hover open while the pointer moves onto the tip. */
  function retain(forId: number) {
    if (hoverSession.value?.heroId === forId) {
      clearLeaveTimer()
    }
  }

  function start(
    id: number,
    el: HTMLElement,
    clientX: number,
    clientY: number,
    matchLevel: number | null = null,
  ) {
    if (stickySession.value?.heroId === id) {
      return
    }

    clearLeaveTimer()
    clearHover()
    const run = ++hoverToken
    hoverSession.value = {
      heroId: id,
      matchLevel,
      triggerEl: el,
      phase: 'quiet',
      sticky: false,
      cursorX: clientX,
      cursorY: clientY,
    }

    const reduced = prefersReducedMotion()
    const quietMs = reduced ? PREVIEW_REDUCED_QUIET_MS : PREVIEW_QUIET_MS

    quietTimer = setTimeout(() => {
      if (run !== hoverToken) {
        return
      }
      if (reduced) {
        patchHover({ phase: 'open' })
        return
      }
      patchHover({ phase: 'ring' })
      ringTimer = setTimeout(() => {
        if (run !== hoverToken) {
          return
        }
        patchHover({ phase: 'open' })
      }, PREVIEW_RING_MS)
    }, quietMs)
  }

  function move(clientX: number, clientY: number) {
    const current = hoverSession.value
    if (!current || (current.phase !== 'quiet' && current.phase !== 'ring')) {
      return
    }
    patchHover({ cursorX: clientX, cursorY: clientY })
  }

  function pin(id: number, el: HTMLElement, matchLevel: number | null = null) {
    // Promote open hover → sticky in place so TransitionGroup keeps the same card.
    stickySession.value = {
      heroId: id,
      matchLevel,
      triggerEl: el,
      phase: 'open',
      sticky: true,
      cursorX: 0,
      cursorY: 0,
    }
    if (hoverSession.value?.heroId === id) {
      hoverToken += 1
      clearHoverTimers()
      clearLeaveTimer()
      hoverSession.value = null
    }
  }

  function togglePin(
    id: number,
    el: HTMLElement,
    matchLevel: number | null = null,
  ) {
    if (stickySession.value?.heroId === id) {
      stickySession.value = null
      return
    }
    pin(id, el, matchLevel)
  }

  function isPinned(id: number) {
    return stickySession.value?.heroId === id
  }

  return {
    stickySession: readonly(stickySession),
    hoverSession: readonly(hoverSession),
    openCards,
    showRing,
    ringCursor,
    ringMs: PREVIEW_RING_MS,
    start,
    move,
    leave,
    retain,
    dismiss,
    dismissSticky,
    pin,
    togglePin,
    isPinned,
  }
}
