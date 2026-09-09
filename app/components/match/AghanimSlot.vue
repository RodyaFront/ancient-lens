<script setup lang="ts">
import {
  ITEM_ID_AGHANIMS_SHARD,
  ITEM_ID_ULTIMATE_SCEPTER,
} from '#shared/match/constants'

const props = defineProps<{
  kind: 'scepter' | 'shard'
  owned: boolean
  extra?: string
}>()

const { t } = useI18n()
const preview = useItemPreview()
const root = ref<HTMLElement | null>(null)

const tipItemId = computed(() =>
  props.kind === 'scepter' ? ITEM_ID_ULTIMATE_SCEPTER : ITEM_ID_AGHANIMS_SHARD,
)

const label = computed(() =>
  props.kind === 'scepter'
    ? t('dialog.aghanimScepter')
    : t('dialog.aghanimShard'),
)

const title = computed(() =>
  props.owned ? label.value : t('dialog.aghanimMissing', { name: label.value }),
)

const imageSrc = computed(
  () => `/images/dota2/${props.kind}_${props.owned ? 1 : 0}.png`,
)

const pinnedHere = computed(() => preview.isPinned(tipItemId.value))

function handleClick() {
  if (!root.value) {
    return
  }
  preview.togglePin(tipItemId.value, root.value)
}

function onPointerEnter(event: PointerEvent) {
  if (!root.value) {
    return
  }
  preview.start(tipItemId.value, root.value, event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  preview.move(event.clientX, event.clientY)
}

function onPointerLeave() {
  preview.leave(tipItemId.value)
}

onBeforeUnmount(() => {
  preview.dismiss(tipItemId.value)
})
</script>

<template>
  <button
    ref="root"
    class="item aghanim"
    :class="[
      extra,
      {
        'is-owned': owned,
        'is-inactive': !owned,
        'is-pinned': pinnedHere,
      },
    ]"
    data-item-preview-trigger
    type="button"
    :title="title"
    :aria-label="title"
    :aria-expanded="pinnedHere ? 'true' : undefined"
    @click="handleClick"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointercancel="onPointerLeave"
  >
    <img :src="imageSrc" :alt="title" loading="lazy" />
  </button>
</template>
