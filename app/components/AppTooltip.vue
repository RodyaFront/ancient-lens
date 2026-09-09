<script setup lang="ts">
const props = defineProps<{
  text: string
  label?: string
}>()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tipStyle = ref<Record<string, string>>({})
const tipId = useId()

function place() {
  const el = triggerRef.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  const gap = 8
  const preferAbove = rect.top > 40
  tipStyle.value = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: preferAbove ? `${rect.top - gap}px` : `${rect.bottom + gap}px`,
    transform: preferAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
  }
}

function show() {
  place()
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

watch(open, (isOpen, _previous, onCleanup) => {
  if (!isOpen || !import.meta.client) {
    return
  }
  const update = () => place()
  window.addEventListener('scroll', update, true)
  window.addEventListener('resize', update)
  onCleanup(() => {
    window.removeEventListener('scroll', update, true)
    window.removeEventListener('resize', update)
  })
})
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
    <div
      v-if="open"
      :id="tipId"
      role="tooltip"
      class="app-tooltip"
      :style="tipStyle"
    >
      {{ props.text }}
    </div>
  </Teleport>
</template>
