const QUIET_MS = 150
const RING_MS = 300
const REDUCED_QUIET_MS = 450

export type ItemPreviewPhase = 'quiet' | 'ring' | 'open'

export type ItemPreviewSession = {
  itemId: number
  triggerEl: HTMLElement
  phase: ItemPreviewPhase
  sticky: boolean
  cursorX: number
  cursorY: number
}

const stickySession = shallowRef<ItemPreviewSession | null>(null)
const hoverSession = shallowRef<ItemPreviewSession | null>(null)

let quietTimer: ReturnType<typeof setTimeout> | null = null
let ringTimer: ReturnType<typeof setTimeout> | null = null
let leaveTimer: ReturnType<typeof setTimeout> | null = null
let hoverToken = 0

const LEAVE_GRACE_MS = 120

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

function patchHover(patch: Partial<ItemPreviewSession>) {
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
export function useItemPreview() {
  const openCards = computed(() => {
    const cards: ItemPreviewSession[] = []
    if (stickySession.value?.phase === 'open') {
      cards.push(stickySession.value)
    }
    if (
      hoverSession.value?.phase === 'open' &&
      hoverSession.value.itemId !== stickySession.value?.itemId
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
    if (stickySession.value?.itemId === forId) {
      stickySession.value = null
    }
    if (hoverSession.value?.itemId === forId) {
      clearHover()
    }
  }

  function dismissSticky() {
    stickySession.value = null
  }

  function leave(forId: number) {
    if (hoverSession.value?.itemId !== forId) {
      return
    }
    clearLeaveTimer()
    leaveTimer = setTimeout(() => {
      leaveTimer = null
      if (hoverSession.value?.itemId === forId) {
        clearHover()
      }
    }, LEAVE_GRACE_MS)
  }

  /** Keep hover open while the pointer moves onto the tip (for scroll). */
  function retain(forId: number) {
    if (hoverSession.value?.itemId === forId) {
      clearLeaveTimer()
    }
  }

  function start(
    id: number,
    el: HTMLElement,
    clientX: number,
    clientY: number,
  ) {
    if (stickySession.value?.itemId === id) {
      return
    }

    clearLeaveTimer()
    clearHover()
    const run = ++hoverToken
    hoverSession.value = {
      itemId: id,
      triggerEl: el,
      phase: 'quiet',
      sticky: false,
      cursorX: clientX,
      cursorY: clientY,
    }

    const reduced = prefersReducedMotion()
    const quietMs = reduced ? REDUCED_QUIET_MS : QUIET_MS

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
      }, RING_MS)
    }, quietMs)
  }

  function move(clientX: number, clientY: number) {
    const current = hoverSession.value
    if (!current || (current.phase !== 'quiet' && current.phase !== 'ring')) {
      return
    }
    patchHover({ cursorX: clientX, cursorY: clientY })
  }

  function pin(id: number, el: HTMLElement) {
    if (hoverSession.value?.itemId === id) {
      clearHover()
    }
    stickySession.value = {
      itemId: id,
      triggerEl: el,
      phase: 'open',
      sticky: true,
      cursorX: 0,
      cursorY: 0,
    }
  }

  function togglePin(id: number, el: HTMLElement) {
    if (stickySession.value?.itemId === id) {
      stickySession.value = null
      return
    }
    pin(id, el)
  }

  function isPinned(id: number) {
    return stickySession.value?.itemId === id
  }

  return {
    stickySession: readonly(stickySession),
    hoverSession: readonly(hoverSession),
    openCards,
    showRing,
    ringCursor,
    ringMs: RING_MS,
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
