<script setup lang="ts">
const SIZE = 18
const RADIUS = 7
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const props = defineProps<{
  x: number
  y: number
  durationMs: number
}>()

const { t } = useI18n()
const teleportTo = useFloatTeleportTo()

const OFFSET_REM = 0.5

const style = computed(() => {
  const offsetPx = OFFSET_REM * 16
  return {
    left: `${props.x + offsetPx}px`,
    top: `${props.y + offsetPx}px`,
    '--ring-duration': `${props.durationMs}ms`,
    '--ring-circumference': `${CIRCUMFERENCE}`,
  }
})
</script>

<template>
  <Teleport :to="teleportTo">
    <div
      class="app-cursor-progress"
      role="status"
      :aria-label="t('itemHover.ringAria')"
      :style="style"
    >
      <svg
        class="app-cursor-progress__svg"
        :viewBox="`0 0 ${SIZE} ${SIZE}`"
        aria-hidden="true"
      >
        <circle
          class="app-cursor-progress__track"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
        />
        <circle
          class="app-cursor-progress__fill"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
        />
      </svg>
    </div>
  </Teleport>
</template>
