<script setup lang="ts">
import { isNum } from '#shared/match'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  abilityId: number | undefined
}>()

const { t } = useI18n()
const store = useMatchStore()
const failed = ref(false)

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

watch(imageUrl, () => {
  failed.value = false
})
</script>

<template>
  <span
    v-if="empty"
    class="ability-slot empty-ability"
    :title="title"
    :aria-label="title"
  />
  <span
    v-else
    class="ability-slot"
    :class="{ 'is-talent': entry?.isTalent }"
    :title="title"
    :aria-label="title"
  >
    <img
      v-if="imageUrl && !failed"
      :src="imageUrl"
      :alt="title"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else>{{ initials(title, 2) }}</span>
  </span>
</template>
