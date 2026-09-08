<script setup lang="ts">
import type { ScoreVfxHandle, ScoreVfxWinner } from '~/utils/scoreVfx'

const props = defineProps<{
  winner: ScoreVfxWinner | null
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let vfx: ScoreVfxHandle | null = null
let init: Promise<ScoreVfxHandle | null> | null = null

async function ensureVfx() {
  if (vfx) {
    return vfx
  }
  if (!import.meta.client || !canvas.value) {
    return null
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null
  }
  if (!init) {
    const el = canvas.value
    init = import('~/utils/scoreVfx').then(({ createScoreVfx }) => {
      if (!el.isConnected) {
        return null
      }
      vfx = createScoreVfx(el)
      return vfx
    })
  }
  return init
}

async function play() {
  if (!props.winner) {
    return
  }
  const handle = await ensureVfx()
  handle?.play(props.winner)
}

onMounted(() => {
  void ensureVfx()
})

onBeforeUnmount(() => {
  vfx?.dispose()
  vfx = null
  init = null
})

defineExpose({ play })
</script>

<template>
  <canvas ref="canvas" class="score-vfx-canvas" aria-hidden="true" />
</template>
