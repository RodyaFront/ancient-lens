<script setup lang="ts">
import { UI_RISE_TRANSITION } from '~/utils/uiMotion'

const {
  openCards,
  showRing,
  ringCursor,
  ringMs,
  stickySession,
  dismissSticky,
} = useAbilityPreview()
const teleportTo = useFloatTeleportTo()

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
            '[data-ability-preview-card], [data-ability-preview-trigger]',
          ) ||
          node.closest(
            '[data-ability-preview-card], [data-ability-preview-trigger]',
          )
        ) {
          return true
        }
      }
      return false
    }

    function onPointerDown(event: PointerEvent) {
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
  <Teleport :to="teleportTo">
    <TransitionGroup
      :name="UI_RISE_TRANSITION"
      tag="div"
      class="ui-float-layer"
    >
      <MatchAbilityHoverCard
        v-for="card in openCards"
        :key="card.abilityId"
        :ability-id="card.abilityId"
        :skill-rank="card.skillRank"
        :trigger-el="card.triggerEl"
        :sticky="card.sticky"
      />
    </TransitionGroup>
  </Teleport>
</template>
