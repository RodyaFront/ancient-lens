<script setup lang="ts">
import {
  computeFloatPlacement,
  type FloatPlacementOptions,
} from '~/utils/floatPlacement'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    anchorEl: HTMLElement | null
    preferAboveMin?: number
    gap?: number
    padX?: number
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
    interactive: false,
    zIndex: undefined,
    surfaceClass: undefined,
  },
)

const attrs = useAttrs()
const floatStyle = ref<Record<string, string>>({})

function placementOptions(): FloatPlacementOptions {
  return {
    gap: props.gap,
    preferAboveMin: props.preferAboveMin,
    padX: props.padX,
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
    placementOptions(),
  )
  if (props.zIndex != null) {
    next['--ui-float-z'] = String(props.zIndex)
  }
  floatStyle.value = next
}

watch(
  () =>
    [
      props.anchorEl,
      props.gap,
      props.preferAboveMin,
      props.padX,
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
      class="ui-float__surface"
      :class="[surfaceClass, { 'is-interactive': interactive }]"
      v-bind="attrs"
    >
      <slot />
    </div>
  </div>
</template>
