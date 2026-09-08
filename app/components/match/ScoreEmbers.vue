<script setup lang="ts">
import type { ScoreEmbersHandle, ScoreEmbersWinner } from '~/utils/scoreEmbers'

const props = defineProps<{
  winner: ScoreEmbersWinner | null
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let embers: ScoreEmbersHandle | null = null
let init: Promise<ScoreEmbersHandle | null> | null = null

async function ensure() {
  if (embers) {
    return embers
  }
  if (!import.meta.client || !canvas.value || !props.winner) {
    return null
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
      return embers
    })
  }
  return init
}

onMounted(() => {
  void ensure()
})

watch(
  () => props.winner,
  (winner) => {
    if (!winner) {
      return
    }
    if (embers) {
      embers.setWinner(winner)
      return
    }
    void ensure()
  },
)

onBeforeUnmount(() => {
  embers?.dispose()
  embers = null
  init = null
})
</script>

<template>
  <canvas ref="canvas" class="score-embers-canvas" aria-hidden="true" />
</template>
