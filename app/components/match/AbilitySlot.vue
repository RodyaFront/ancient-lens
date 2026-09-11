<script setup lang="ts">
import { isNum } from '#shared/match'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  abilityId: number | undefined
  /** 1-based how many times this ability was taken up to this column. */
  skillRank?: number | null
}>()

const { t } = useI18n()
const store = useMatchStore()
const preview = useAbilityPreview()
const failed = ref(false)
const root = ref<HTMLElement | null>(null)

const entry = computed(() =>
  typeof props.abilityId === 'number'
    ? store.abilityById(props.abilityId)
    : undefined,
)

const empty = computed(() => !isNum(props.abilityId))

const title = computed(() => {
  if (empty.value) {
    return t('scoreboard.skillEmpty')
  }
  return (
    entry.value?.dname ||
    t('format.abilityFallback', { id: props.abilityId as number })
  )
})

const imageUrl = computed(() => {
  if (entry.value?.isTalent) {
    return '/images/dota2/talent_tree.svg'
  }
  return steamAssetUrl(entry.value?.img)
})

const pinnedHere = computed(
  () => isNum(props.abilityId) && preview.isPinned(props.abilityId),
)

const rank = computed(() => props.skillRank ?? null)

watch(imageUrl, () => {
  failed.value = false
})

function handleClick() {
  if (!isNum(props.abilityId) || !root.value) {
    return
  }
  preview.togglePin(props.abilityId, root.value, rank.value)
}

function onPointerEnter(event: PointerEvent) {
  if (!isNum(props.abilityId) || !root.value) {
    return
  }
  preview.start(
    props.abilityId,
    root.value,
    event.clientX,
    event.clientY,
    rank.value,
  )
}

function onPointerMove(event: PointerEvent) {
  if (!isNum(props.abilityId)) {
    return
  }
  preview.move(event.clientX, event.clientY)
}

function onPointerLeave() {
  if (!isNum(props.abilityId)) {
    return
  }
  preview.leave(props.abilityId)
}

onBeforeUnmount(() => {
  if (!isNum(props.abilityId)) {
    return
  }
  preview.dismiss(props.abilityId)
})
</script>

<template>
  <span
    v-if="empty"
    class="ability-slot empty-ability"
    :title="title"
    :aria-label="title"
  />
  <button
    v-else
    ref="root"
    class="ability-slot ui-press"
    :class="{ 'is-talent': entry?.isTalent, 'is-pinned': pinnedHere }"
    type="button"
    data-ability-preview-trigger
    :aria-label="title"
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
      :alt="title"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else>{{ initials(title, 2) }}</span>
  </button>
</template>
