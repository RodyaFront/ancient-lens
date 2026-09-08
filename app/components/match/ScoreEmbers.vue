<script setup lang="ts">
import type { ScoreEmbersHandle } from '~/utils/scoreEmbers'

const canvas = ref<HTMLCanvasElement | null>(null)
let embers: ScoreEmbersHandle | null = null

onMounted(async () => {
  if (!import.meta.client || !canvas.value) {
    return
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  const el = canvas.value
  const { createScoreEmbers } = await import('~/utils/scoreEmbers')
  if (!el.isConnected) {
    return
  }
  embers = createScoreEmbers(el)
})

onBeforeUnmount(() => {
  embers?.dispose()
  embers = null
})
</script>

<template>
  <canvas ref="canvas" class="score-embers-canvas" aria-hidden="true" />
</template>
