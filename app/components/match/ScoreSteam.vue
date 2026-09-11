<script setup lang="ts">
import {
  SCORE_STEAM_INTRO_DELAY,
  type ScoreSteamHandle,
  type ScoreSteamWinner,
} from '~/utils/scoreSteam'

const props = defineProps<{
  winner: ScoreSteamWinner | null
}>()

const audio = useScoreAudio()
const canvas = ref<HTMLCanvasElement | null>(null)
let steam: ScoreSteamHandle | null = null
let init: Promise<ScoreSteamHandle | null> | null = null
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
  audio.prepareAmbientFire()
  fireTimer = setTimeout(() => {
    fireTimer = null
    if (props.winner) {
      void audio.startFire(props.winner, canvas.value)
    }
  }, SCORE_STEAM_INTRO_DELAY * 1000)
}

function disposeSteam() {
  steam?.dispose()
  steam = null
  init = null
}

async function ensure() {
  if (steam) {
    return steam
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
    init = import('~/utils/scoreSteam').then(({ createScoreSteam }) => {
      if (!el.isConnected || !winner) {
        return null
      }
      steam = createScoreSteam(el, winner)
      scheduleFire()
      return steam
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
    if (steam) {
      steam.setWinner(winner)
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
  disposeSteam()
})
</script>

<template>
  <canvas ref="canvas" class="score-steam-canvas" aria-hidden="true" />
</template>
