<script setup lang="ts">
import type { MatchPlayer } from '#shared/match/types'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = withDefaults(
  defineProps<{
    player: MatchPlayer
    showLevel?: boolean
  }>(),
  { showLevel: true },
)

const store = useMatchStore()
const label = computed(() => store.heroName(props.player))
const imageUrl = computed(() =>
  steamAssetUrl(store.heroById(props.player.hero_id)?.img),
)
const fallback = computed(() => initials(label.value))
const failed = ref(false)

watch(imageUrl, () => {
  failed.value = false
})
</script>

<template>
  <span class="hero-picture">
    <img
      v-if="imageUrl && !failed"
      :src="imageUrl"
      :alt="label"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else>{{ fallback }}</span>
    <span v-if="showLevel && typeof player.level === 'number'" class="level">
      {{ player.level }}
    </span>
  </span>
</template>
