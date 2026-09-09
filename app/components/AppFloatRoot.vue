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
  }
}

function readTipSize(el: HTMLElement): FloatTipSize {
  return {
    width: el.offsetWidth,
    height: el.offsetHeight,
  }
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
  floatStyle.value = next
}

function bindSurface(el: Element | ComponentPublicInstance | null) {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  const node = el instanceof HTMLElement ? el : null
  surfaceRef.value = node
  if (!node || !import.meta.client) {
    tipSize.value = null
    return
  }

  tipSize.value = readTipSize(node)
  place()

  if (typeof ResizeObserver === 'undefined') {
    return
  }
  resizeObserver = new ResizeObserver(() => {
    if (!surfaceRef.value) {
      return
    }
    tipSize.value = readTipSize(surfaceRef.value)
    place()
  })
  resizeObserver.observe(node)
}

watch(
  () =>
    [
      props.anchorEl,
      props.gap,
      props.preferAboveMin,
      props.padX,
      props.padY,
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
      :ref="bindSurface"
      class="ui-float__surface"
      :class="[surfaceClass, { 'is-interactive': interactive }]"
      v-bind="attrs"
    >
      <slot />
    </div>
  </div>
</template>
