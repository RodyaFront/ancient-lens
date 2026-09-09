<script setup lang="ts">
import { UI_RISE_TRANSITION } from '~/utils/uiMotion'

const props = defineProps<{
  text: string
  label?: string
}>()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tipId = useId()

function show() {
  open.value = true
}

function hide() {
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    hide()
  }
}
</script>

<template>
  <span
    ref="triggerRef"
    class="app-tooltip-trigger"
    tabindex="0"
    :aria-label="props.label || props.text"
    :aria-describedby="open ? tipId : undefined"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @keydown="onKeydown"
  >
    <slot />
  </span>
  <Teleport to="body">
    <Transition :name="UI_RISE_TRANSITION">
      <AppFloatRoot
        v-if="open"
        :id="tipId"
        role="tooltip"
        :anchor-el="triggerRef"
        surface-class="app-tooltip"
        :z-index="60"
      >
        {{ props.text }}
      </AppFloatRoot>
    </Transition>
  </Teleport>
</template>
