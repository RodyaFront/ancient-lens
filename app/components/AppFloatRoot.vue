<script setup lang="ts">
import {
  computeFloatPlacement,
  type FloatPlacementOptions,
  type FloatTipSize,
} from '~/utils/floatPlacement'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    anchorEl: HTMLElement | null
    preferAboveMin?: number
    gap?: number
    padX?: number
    padY?: number
    align?: 'center' | 'start' | 'end'
    /** Sets `--ui-float-z` on the shell. */
    zIndex?: number | string
    interactive?: boolean
    surfaceClass?:
      string | Record<string, boolean> | Array<string | Record<string, boolean>>
  }>(),
  {
    preferAboveMin: 40,
    gap: 8,
    padX: 12,
    padY: 12,
    align: 'center',
    interactive: false,
    zIndex: undefined,
    surfaceClass: undefined,
  },
)

const attrs = useAttrs()
const floatStyle = ref<Record<string, string>>({})
const surfaceRef = ref<HTMLElement | null>(null)
const tipSize = ref<FloatTipSize | null>(null)
let resizeObserver: ResizeObserver | null = null

function placementOptions(): FloatPlacementOptions {
  return {
    gap: props.gap,
    preferAboveMin: props.preferAboveMin,
    padX: props.padX,
    padY: props.padY,
    align: props.align,
  }
}

function readTipSize(el: HTMLElement): FloatTipSize {
  return {
    width: el.offsetWidth,
    height: el.offsetHeight,
  }
}

function sameTipSize(a: FloatTipSize | null, b: FloatTipSize | null) {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.width === b.width && a.height === b.height
}

function sameStyle(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}

function place() {
  const el = props.anchorEl
  if (!el || !import.meta.client) {
    return
  }

  const next = computeFloatPlacement(
    el.getBoundingClientRect(),
    window,
    tipSize.value,
    placementOptions(),
  )
  if (props.zIndex != null) {
    next['--ui-float-z'] = String(props.zIndex)
  }
  if (sameStyle(floatStyle.value, next)) {
    return
  }
  floatStyle.value = next
}

function syncSurface(node: HTMLElement | null) {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (!node || !import.meta.client) {
    if (tipSize.value !== null) {
      tipSize.value = null
    }
    return
  }

  const nextSize = readTipSize(node)
  if (!sameTipSize(tipSize.value, nextSize)) {
    tipSize.value = nextSize
  }
  place()

  if (typeof ResizeObserver === 'undefined') {
    return
  }
  resizeObserver = new ResizeObserver(() => {
    const current = surfaceRef.value
    if (!current) {
      return
    }
    const size = readTipSize(current)
    if (sameTipSize(tipSize.value, size)) {
      return
    }
    tipSize.value = size
    place()
  })
  resizeObserver.observe(node)
}

watch(surfaceRef, (node) => {
  syncSurface(node)
})

watch(
  () =>
    [
      props.anchorEl,
      props.gap,
      props.preferAboveMin,
      props.padX,
      props.padY,
      props.align,
      props.zIndex,
    ] as const,
  () => {
    place()
  },
  { immediate: true },
)

onMounted(() => {
  if (!import.meta.client) {
    return
  }
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (!import.meta.client) {
    return
  }
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
})

defineExpose({ place })
</script>

<template>
  <div class="ui-float" :style="floatStyle">
    <div
      ref="surfaceRef"
      class="ui-float__surface"
      :class="[surfaceClass, { 'is-interactive': interactive }]"
      v-bind="attrs"
    >
      <slot />
    </div>
  </div>
</template>
