<script setup lang="ts">
import { isNum } from '#shared/match'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  itemId: number | undefined
  extra?: string
}>()

const emit = defineEmits<{
  open: [id: number]
}>()

const store = useMatchStore()
const failed = ref(false)

const entry = computed(() =>
  typeof props.itemId === 'number' ? store.itemById(props.itemId) : undefined,
)
const title = computed(() => {
  if (props.itemId === 0) {
    return 'Порожній слот'
  }
  if (!isNum(props.itemId)) {
    return 'Дані слота не надано'
  }
  return entry.value?.dname || `Предмет #${props.itemId}`
})
const imageUrl = computed(() => steamAssetUrl(entry.value?.img))
const empty = computed(() => props.itemId === 0 || !isNum(props.itemId))
const emptyMark = computed(() => (props.itemId === 0 ? '·' : '—'))

watch(imageUrl, () => {
  failed.value = false
})

function handleClick() {
  if (isNum(props.itemId) && props.itemId !== 0) {
    emit('open', props.itemId)
  }
}
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
    class="item"
    :class="extra"
    :title="title"
    :aria-label="title"
    type="button"
    @click="handleClick"
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
