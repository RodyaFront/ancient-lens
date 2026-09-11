<script setup lang="ts">
import {
  SCORE_EMBERS_INTRO_DELAY,
  type ScoreEmbersHandle,
  type ScoreEmbersWinner,
} from '~/utils/scoreEmbers'

const props = defineProps<{
  winner: ScoreEmbersWinner | null
}>()

const audio = useScoreAudio()
const canvas = ref<HTMLCanvasElement | null>(null)
let embers: ScoreEmbersHandle | null = null
let init: Promise<ScoreEmbersHandle | null> | null = null
let fireTimer: ReturnType<typeof setTimeout> | null = null

function clearFireTimer() {
  if (fireTimer) {
    clearTimeout(fireTimer)
    fireTimer = null
  }
}

function onScrollOrResize() {
  audio.syncFireScrollFromWindow(canvas.value)
}

function bindScrollVolume() {
  if (!import.meta.client) {
    return
  }
  audio.syncFireScrollFromWindow(canvas.value)
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize)
}

function unbindScrollVolume() {
  if (!import.meta.client) {
    return
  }
  window.removeEventListener('scroll', onScrollOrResize)
  window.removeEventListener('resize', onScrollOrResize)
}

function scheduleFire() {
  clearFireTimer()
  if (!import.meta.client || !props.winner || audio.reducedMotion()) {
    return
  }
  audio.setFireSide(props.winner)
  audio.syncFireSpatialFromElement(canvas.value)
  // Cold match-page entry: arm first click/key so fire can fade in after autoplay block.
  audio.prepareAmbientFire()
  // Match hearth fade-in: also try when coals become visible (works if already unlocked).
  fireTimer = setTimeout(() => {
    fireTimer = null
    if (props.winner) {
      void audio.startFire(props.winner, canvas.value)
    }
  }, SCORE_EMBERS_INTRO_DELAY * 1000)
}

function disposeEmbers() {
  embers?.dispose()
  embers = null
  init = null
}

async function ensure() {
  if (embers) {
    return embers
  }
  if (!import.meta.client || !canvas.value || !props.winner) {
    return null
  }
  if (audio.reducedMotion()) {
    return null
  }
  if (!init) {
    const el = canvas.value
    const winner = props.winner
    init = import('~/utils/scoreEmbers').then(({ createScoreEmbers }) => {
      if (!el.isConnected || !winner) {
        return null
      }
      embers = createScoreEmbers(el, winner)
      scheduleFire()
      return embers
    })
  }
  return init
}

onMounted(() => {
  bindScrollVolume()
  void ensure()
})

watch(
  () => props.winner,
  (winner) => {
    if (!winner) {
      clearFireTimer()
      audio.stopFire()
      return
    }
    if (embers) {
      embers.setWinner(winner)
      audio.setFireSide(winner)
      audio.syncFireSpatialFromElement(canvas.value)
      return
    }
    void ensure()
  },
)

onBeforeUnmount(() => {
  clearFireTimer()
  unbindScrollVolume()
  audio.stopFire()
  disposeEmbers()
})
</script>

<template>
  <canvas ref="canvas" class="score-embers-canvas" aria-hidden="true" />
</template>
