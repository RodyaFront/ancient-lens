<script setup lang="ts">
const {
  openCards,
  showRing,
  ringCursor,
  ringMs,
  stickySession,
  dismissSticky,
} = useItemPreview()

watch(
  stickySession,
  (session, _previous, onCleanup) => {
    if (!session || !import.meta.client) {
      return
    }

    function isInsidePreview(event: Event) {
      for (const node of event.composedPath()) {
        if (!(node instanceof Element)) {
          continue
        }
        if (
          node.matches(
            '[data-item-preview-card], [data-item-preview-trigger]',
          ) ||
          node.closest('[data-item-preview-card], [data-item-preview-trigger]')
        ) {
          return true
        }
      }
      return false
    }

    function onPointerDown(event: PointerEvent) {
      // Clicks inside the tip (text select, copy, chips) must not unpin.
      if (isInsidePreview(event)) {
        return
      }
      dismissSticky()
    }

    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dismissSticky()
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeydown)
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeydown)
    })
  },
  { flush: 'post' },
)
</script>

<template>
  <AppCursorProgress
    v-if="showRing"
    :x="ringCursor.x"
    :y="ringCursor.y"
    :duration-ms="ringMs"
  />
  <MatchItemHoverCard
    v-for="card in openCards"
    :key="`${card.sticky ? 'pin' : 'hover'}-${card.itemId}`"
    :item-id="card.itemId"
    :trigger-el="card.triggerEl"
    :sticky="card.sticky"
  />
</template>
