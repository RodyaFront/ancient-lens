<script setup lang="ts">
import type { MatchPlayer } from '#shared/match/types'
import { isNum } from '#shared/match'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = withDefaults(
  defineProps<{
    player: MatchPlayer
    showLevel?: boolean
  }>(),
  { showLevel: true },
)

const store = useMatchStore()
const preview = useHeroPreview()
const root = ref<HTMLElement | null>(null)

const heroId = computed(() =>
  isNum(props.player.hero_id) ? props.player.hero_id : null,
)
const matchLevel = computed(() =>
  typeof props.player.level === 'number' && Number.isFinite(props.player.level)
    ? props.player.level
    : null,
)
const label = computed(() => store.heroName(props.player))
const imageUrl = computed(() =>
  steamAssetUrl(store.heroById(props.player.hero_id)?.img),
)
const fallback = computed(() => initials(label.value))
const failed = ref(false)
const pinnedHere = computed(
  () => heroId.value != null && preview.isPinned(heroId.value),
)

watch(imageUrl, () => {
  failed.value = false
})

function handleClick() {
  if (heroId.value == null || !root.value) {
    return
  }
  preview.togglePin(heroId.value, root.value, matchLevel.value)
}

function onPointerEnter(event: PointerEvent) {
  if (heroId.value == null || !root.value) {
    return
  }
  preview.start(
    heroId.value,
    root.value,
    event.clientX,
    event.clientY,
    matchLevel.value,
  )
}

function onPointerMove(event: PointerEvent) {
  if (heroId.value == null) {
    return
  }
  preview.move(event.clientX, event.clientY)
}

function onPointerLeave() {
  if (heroId.value == null) {
    return
  }
  preview.leave(heroId.value)
}

onBeforeUnmount(() => {
  if (heroId.value == null) {
    return
  }
  preview.dismiss(heroId.value)
})
</script>

<template>
  <span v-if="heroId == null" class="hero-picture">
    <span>{{ fallback }}</span>
    <span v-if="showLevel && matchLevel != null" class="level">
      {{ matchLevel }}
    </span>
  </span>
  <button
    v-else
    ref="root"
    class="hero-picture"
    :class="{ 'is-pinned': pinnedHere }"
    type="button"
    data-hero-preview-trigger
    :aria-label="label"
    :aria-expanded="pinnedHere ? 'true' : undefined"
    @click="handleClick"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointercancel="onPointerLeave"
  >
    <img
      v-if="imageUrl && !failed"
      :src="imageUrl"
      :alt="label"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else>{{ fallback }}</span>
    <span v-if="showLevel && matchLevel != null" class="level">
      {{ matchLevel }}
    </span>
  </button>
</template>
