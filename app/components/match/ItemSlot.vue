<script setup lang="ts">
import { isNum } from '#shared/match'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  itemId: number | undefined
  extra?: string
}>()

const { t } = useI18n()
const store = useMatchStore()
const preview = useItemPreview()
const failed = ref(false)
const root = ref<HTMLElement | null>(null)

const entry = computed(() =>
  typeof props.itemId === 'number' ? store.itemById(props.itemId) : undefined,
)
const title = computed(() => {
  if (props.itemId === 0) {
    return t('format.emptySlot')
  }
  if (!isNum(props.itemId)) {
    return t('format.slotUnknown')
  }
  return entry.value?.dname || t('format.itemFallback', { id: props.itemId })
})
const imageUrl = computed(() => steamAssetUrl(entry.value?.img))
const empty = computed(() => props.itemId === 0 || !isNum(props.itemId))
const emptyMark = computed(() => (props.itemId === 0 ? '·' : '—'))
const pinnedHere = computed(
  () => isNum(props.itemId) && preview.isPinned(props.itemId),
)

watch(imageUrl, () => {
  failed.value = false
})

function handleClick() {
  if (!isNum(props.itemId) || props.itemId === 0 || !root.value) {
    return
  }
  preview.togglePin(props.itemId, root.value)
}

function onPointerEnter(event: PointerEvent) {
  if (!isNum(props.itemId) || props.itemId === 0 || !root.value) {
    return
  }
  preview.start(props.itemId, root.value, event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  if (!isNum(props.itemId) || props.itemId === 0) {
    return
  }
  preview.move(event.clientX, event.clientY)
}

function onPointerLeave() {
  if (!isNum(props.itemId) || props.itemId === 0) {
    return
  }
  preview.leave(props.itemId)
}

onBeforeUnmount(() => {
  if (!isNum(props.itemId) || props.itemId === 0) {
    return
  }
  // Trigger gone — pinned tip cannot stay anchored.
  preview.dismiss(props.itemId)
})
</script>

<template>
  <span
    v-if="empty"
    class="item empty-item"
    :class="extra"
    :title="title"
    :aria-label="title"
  >
    {{ emptyMark }}
  </span>
  <button
    v-else
    ref="root"
    class="item"
    :class="[extra, { 'is-pinned': pinnedHere }]"
    data-item-preview-trigger
    :aria-label="title"
    :aria-expanded="pinnedHere ? 'true' : undefined"
    type="button"
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
    <span v-else>{{ initials(title, 3) }}</span>
  </button>
</template>
