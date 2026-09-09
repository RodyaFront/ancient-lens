const WHOOSH_URL = '/audio/score-whoosh.mp3'
const FIRE_URL = '/audio/score-fire.mp3'
const WHOOSH_GAIN = 0.0825
/** Peak fire level at the top of the page (5%). */
export const FIRE_GAIN_MAX = 0.05
const FIRE_FADE_SEC = 1.25
const MUTE_STORAGE_KEY = 'ancient-lens-audio-muted'

let scoreAudioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let whooshBuffer: AudioBuffer | null = null
let whooshLoad: Promise<AudioBuffer | null> | null = null
let fireBuffer: AudioBuffer | null = null
let fireLoad: Promise<AudioBuffer | null> | null = null
let fireSource: AudioBufferSourceNode | null = null
let fireGain: GainNode | null = null
let firePanner: PannerNode | null = null
let fireWanted = false
let fireStarting = false
/** Winner side bias on X (− left / + right). */
let fireSide: 'radiant' | 'dire' = 'radiant'
/** Last known 3D seat for the hearth (tracks the card while scrolling). */
let firePos = { x: -0.75, y: 0, z: -0.45 }
/** 1 at page top → 0 after ~one viewport of scroll. */
let fireScrollFactor = 1
let gestureArm = false
let gestureAbort: AbortController | null = null
let muteHydrated = false
/** Tab not visible — silence master gain without touching user mute intent. */
let tabHidden = false
let visibilityArmed = false

/**
 * Master output is silent when the user muted or the browser tab is hidden.
 * Explicit mute always wins; visibility only layers temporary silence.
 */
export function isAudioOutputSilenced(userMuted: boolean, pageHidden: boolean) {
  return userMuted || pageHidden
}

/** Louder at the top; fades out as the user scrolls down. */
export function fireGainFromScroll(
  scrollY: number,
  viewportHeight: number,
  maxGain = FIRE_GAIN_MAX,
) {
  const span = Math.max(viewportHeight, 1)
  const away = Math.min(1, Math.max(0, scrollY / span))
  return maxGain * (1 - away)
}

/**
 * Place the fire in listener space from the score-card canvas rect.
 * Screen up → +Y so the crackle rises/falls with scroll.
 */
export function firePositionFromElement(
  side: 'radiant' | 'dire',
  rect: Pick<
    DOMRect,
    'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'
  > | null,
  viewport: { width: number; height: number },
) {
  const sideX = side === 'dire' ? 0.85 : -0.85
  if (!rect || viewport.width <= 0 || viewport.height <= 0) {
    return { x: sideX, y: 0, z: -0.45 }
  }
  const cornerX = side === 'dire' ? rect.right - 20 : rect.left + 20
  const cornerY = rect.bottom - 16
  const nx = (cornerX / viewport.width) * 2 - 1
  const ny = 1 - (cornerY / viewport.height) * 2
  return {
    x: sideX * 0.7 + nx * 0.3,
    y: Math.max(-1.35, Math.min(1.35, ny)),
    z: -0.45,
  }
}

function setPannerPosition(
  panner: PannerNode,
  pos: { x: number; y: number; z: number },
  immediate: boolean,
) {
  const now = panner.context.currentTime
  const ramp = immediate ? 0 : 0.12
  if (immediate) {
    panner.positionX.setValueAtTime(pos.x, now)
    panner.positionY.setValueAtTime(pos.y, now)
    panner.positionZ.setValueAtTime(pos.z, now)
    return
  }
  panner.positionX.setValueAtTime(panner.positionX.value, now)
  panner.positionY.setValueAtTime(panner.positionY.value, now)
  panner.positionZ.setValueAtTime(panner.positionZ.value, now)
  panner.positionX.linearRampToValueAtTime(pos.x, now + ramp)
  panner.positionY.linearRampToValueAtTime(pos.y, now + ramp)
  panner.positionZ.linearRampToValueAtTime(pos.z, now + ramp)
}

export function useScoreAudio() {
  const muted = useState('ancient-lens-audio-muted', () => false)

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function hydrateMute() {
    if (muteHydrated || import.meta.server) {
      return
    }
    muteHydrated = true
    try {
      muted.value = localStorage.getItem(MUTE_STORAGE_KEY) === '1'
    } catch {
      muted.value = false
    }
  }

  function outputSilenced() {
    return isAudioOutputSilenced(muted.value, tabHidden)
  }

  function ensureContext() {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) {
      return null
    }
    if (!scoreAudioContext) {
      scoreAudioContext = new Context()
      masterGain = scoreAudioContext.createGain()
      masterGain.gain.value = outputSilenced() ? 0.0001 : 1
      masterGain.connect(scoreAudioContext.destination)
    }
    return scoreAudioContext
  }

  function output() {
    return masterGain ?? scoreAudioContext?.destination ?? null
  }

  function applyMasterMute(immediate = false) {
    const ctx = scoreAudioContext
    const gain = masterGain
    if (!ctx || !gain) {
      return
    }
    const next = outputSilenced() ? 0.0001 : 1
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    if (immediate) {
      gain.gain.setValueAtTime(next, now)
      return
    }
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
    gain.gain.linearRampToValueAtTime(next, now + 0.2)
  }

  function syncTabVisibility() {
    if (import.meta.server) {
      return
    }
    const nextHidden = document.visibilityState === 'hidden'
    if (nextHidden === tabHidden) {
      return
    }
    tabHidden = nextHidden
    hydrateMute()
    applyMasterMute(nextHidden)
    if (nextHidden || muted.value) {
      return
    }
    // Browsers often suspend AudioContext while hidden; resume ambient on return.
    const ctx = scoreAudioContext
    if (!ctx) {
      return
    }
    void ctx.resume().then(() => {
      flushAmbientAfterUnlock()
    })
  }

  function armTabVisibilityMute() {
    if (visibilityArmed || import.meta.server) {
      return
    }
    visibilityArmed = true
    tabHidden = document.visibilityState === 'hidden'
    document.addEventListener('visibilitychange', syncTabVisibility)
    if (tabHidden) {
      applyMasterMute(true)
    }
  }

  function setMuted(next: boolean) {
    hydrateMute()
    muted.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // Ignore quota / private mode.
      }
    }
    ensureContext()
    applyMasterMute()
    if (next) {
      // Keep fireWanted so unmute can resume ambient crackle.
      stopFireNodes(true)
      return
    }
    if (fireWanted) {
      void startFire()
    }
  }

  function toggleMute() {
    hydrateMute()
    // Click is a user gesture — unlock so unmute can restart fire immediately.
    unlock()
    setMuted(!muted.value)
  }

  function decodeUrl(ctx: AudioContext, url: string) {
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${url} ${response.status}`)
        }
        return response.arrayBuffer()
      })
      .then((bytes) => ctx.decodeAudioData(bytes.slice(0)))
  }

  function loadWhoosh(ctx: AudioContext) {
    if (whooshBuffer) {
      return Promise.resolve(whooshBuffer)
    }
    if (!whooshLoad) {
      whooshLoad = decodeUrl(ctx, WHOOSH_URL)
        .then((buffer) => {
          whooshBuffer = buffer
          return buffer
        })
        .catch(() => {
          whooshLoad = null
          return null
        })
    }
    return whooshLoad
  }

  function loadFire(ctx: AudioContext) {
    if (fireBuffer) {
      return Promise.resolve(fireBuffer)
    }
    if (!fireLoad) {
      fireLoad = decodeUrl(ctx, FIRE_URL)
        .then((buffer) => {
          fireBuffer = buffer
          return buffer
        })
        .catch(() => {
          fireLoad = null
          return null
        })
    }
    return fireLoad
  }

  function startWhoosh(buffer: AudioBuffer) {
    const ctx = scoreAudioContext
    const dest = output()
    if (!ctx || !dest || ctx.state !== 'running' || outputSilenced()) {
      return false
    }
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    gain.gain.value = WHOOSH_GAIN
    source.connect(gain).connect(dest)
    source.start()
    return true
  }

  function targetFireGain() {
    return FIRE_GAIN_MAX * fireScrollFactor
  }

  function applyFireGain(immediate = false) {
    const ctx = scoreAudioContext
    const gain = fireGain
    if (!ctx || !gain) {
      return
    }
    const next = Math.max(0.0001, targetFireGain())
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    if (immediate) {
      gain.gain.setValueAtTime(next, now)
      return
    }
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
    gain.gain.linearRampToValueAtTime(next, now + 0.08)
  }

  function setFireScrollFactor(factor: number) {
    fireScrollFactor = Math.min(1, Math.max(0, factor))
    applyFireGain()
  }

  function applyFirePosition(immediate = false) {
    if (!firePanner) {
      return
    }
    setPannerPosition(firePanner, firePos, immediate)
  }

  function setFireSide(side: 'radiant' | 'dire') {
    fireSide = side
    firePos = {
      ...firePos,
      x: side === 'dire' ? 0.85 : -0.85,
    }
    applyFirePosition()
  }

  function syncFireSpatialFromElement(el: HTMLElement | null) {
    if (!import.meta.client) {
      return
    }
    const rect = el?.getBoundingClientRect() ?? null
    firePos = firePositionFromElement(fireSide, rect, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    applyFirePosition()
  }

  function syncFireScrollFromWindow(el?: HTMLElement | null) {
    if (!import.meta.client) {
      return
    }
    const gain = fireGainFromScroll(window.scrollY, window.innerHeight)
    setFireScrollFactor(FIRE_GAIN_MAX > 0 ? gain / FIRE_GAIN_MAX : 0)
    if (el !== undefined) {
      syncFireSpatialFromElement(el)
    }
  }

  function stopFireNodes(fadeOut: boolean) {
    const ctx = scoreAudioContext
    const source = fireSource
    const gain = fireGain
    fireSource = null
    fireGain = null
    firePanner = null
    if (!source || !gain || !ctx) {
      return
    }
    try {
      if (fadeOut) {
        const now = ctx.currentTime
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(gain.gain.value, now)
        gain.gain.linearRampToValueAtTime(0.0001, now + FIRE_FADE_SEC)
        source.stop(now + FIRE_FADE_SEC + 0.02)
      } else {
        source.stop()
      }
    } catch {
      // Already stopped.
    }
  }

  function startFireNodes(buffer: AudioBuffer) {
    const ctx = scoreAudioContext
    const dest = output()
    if (
      !ctx ||
      !dest ||
      ctx.state !== 'running' ||
      !fireWanted ||
      outputSilenced()
    ) {
      return false
    }
    if (fireSource) {
      applyFireGain()
      applyFirePosition()
      return true
    }
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    const panner = ctx.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'linear'
    panner.refDistance = 1
    panner.maxDistance = 6
    panner.rolloffFactor = 1
    panner.coneInnerAngle = 360
    panner.coneOuterAngle = 360
    source.buffer = buffer
    source.loop = true
    const now = ctx.currentTime
    const peak = Math.max(0.0001, targetFireGain())
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(peak, now + FIRE_FADE_SEC)
    setPannerPosition(panner, firePos, true)
    source.connect(gain).connect(panner).connect(dest)
    source.start()
    fireSource = source
    fireGain = gain
    firePanner = panner
    source.onended = () => {
      if (fireSource === source) {
        fireSource = null
        fireGain = null
        firePanner = null
      }
    }
    return true
  }

  function flushAmbientAfterUnlock() {
    if (fireWanted) {
      void startFire()
    }
  }

  function disarmGestureUnlock() {
    gestureArm = false
    gestureAbort?.abort()
    gestureAbort = null
  }

  function armGestureUnlock() {
    if (gestureArm || import.meta.server || reducedMotion()) {
      return
    }
    gestureArm = true
    gestureAbort?.abort()
    const abort = new AbortController()
    gestureAbort = abort
    const onGesture = () => {
      disarmGestureUnlock()
      // First interaction after a cold match-page load: unlock + fade fire in.
      // Whoosh is intentionally not replayed — it only belongs to the reveal beat.
      unlock()
    }
    window.addEventListener('pointerdown', onGesture, {
      capture: true,
      signal: abort.signal,
    })
    window.addEventListener('keydown', onGesture, {
      capture: true,
      signal: abort.signal,
    })
  }

  /**
   * Mark ambient fire as desired and listen for the first page gesture.
   * Used on cold match-page loads where autoplay blocked the timed start.
   */
  function prepareAmbientFire() {
    if (import.meta.server || reducedMotion()) {
      return
    }
    fireWanted = true
    syncFireScrollFromWindow()
    const ctx = ensureContext()
    if (ctx) {
      void loadFire(ctx)
    }
    if (!fireSource) {
      armGestureUnlock()
    }
  }

  function unlock() {
    if (import.meta.server || reducedMotion()) {
      return
    }

    try {
      const ctx = ensureContext()
      if (!ctx) {
        return
      }
      void ctx.resume().then(() => {
        flushAmbientAfterUnlock()
      })
      void loadFire(ctx)
    } catch {
      // Audio is optional.
    }
  }

  function play(_winner: 'radiant' | 'dire') {
    if (import.meta.server || reducedMotion()) {
      return
    }
    hydrateMute()
    if (outputSilenced()) {
      return
    }

    const ctx = ensureContext()
    if (!ctx) {
      return
    }

    // Kick resume for gesture-linked loads, but never wait on a later click to salvage whoosh.
    void ctx.resume().catch(() => {
      // Autoplay may block.
    })

    // Reveal whoosh is immediate-or-never: if AudioContext is still suspended,
    // skip it so a later unlock click only starts the ambient fire.
    if (ctx.state !== 'running') {
      return
    }

    void (async () => {
      const buffer = await loadWhoosh(ctx)
      if (!buffer || outputSilenced() || ctx.state !== 'running') {
        return
      }
      startWhoosh(buffer)
    })()
  }

  async function startFire(side?: 'radiant' | 'dire', el?: HTMLElement | null) {
    if (import.meta.server || reducedMotion()) {
      return
    }
    hydrateMute()
    if (side) {
      setFireSide(side)
    }
    fireWanted = true
    syncFireScrollFromWindow(el ?? null)
    if (outputSilenced()) {
      return
    }
    if (fireSource) {
      applyFireGain()
      applyFirePosition()
      disarmGestureUnlock()
      return
    }
    if (fireStarting) {
      return
    }
    const ctx = ensureContext()
    if (!ctx) {
      armGestureUnlock()
      return
    }
    fireStarting = true
    try {
      try {
        await ctx.resume()
      } catch {
        // Autoplay may block until a gesture.
      }
      const buffer = await loadFire(ctx)
      if (!buffer || !fireWanted || outputSilenced()) {
        return
      }
      if (startFireNodes(buffer)) {
        disarmGestureUnlock()
        return
      }
      armGestureUnlock()
    } finally {
      fireStarting = false
    }
  }

  function stopFire() {
    fireWanted = false
    disarmGestureUnlock()
    stopFireNodes(true)
  }

  // Do not trust setup-time hydrate with useState: Nuxt may apply the SSR
  // payload (always `false`) after this runs and wipe a localStorage restore.
  if (import.meta.client) {
    onMounted(() => {
      muteHydrated = false
      hydrateMute()
      armTabVisibilityMute()
      applyMasterMute(true)
    })
  }

  return {
    muted,
    setMuted,
    toggleMute,
    unlock,
    play,
    prepareAmbientFire,
    startFire,
    stopFire,
    setFireSide,
    syncFireScrollFromWindow,
    syncFireSpatialFromElement,
    reducedMotion,
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
