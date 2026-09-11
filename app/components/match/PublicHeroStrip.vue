<script setup lang="ts">
import { HEROES_BY_ID, heroSlots } from '#shared/match'
import { steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  teamIds?: number[]
  label: string
  tone: 'radiant' | 'dire'
  matchId: number
}>()

type Cell = {
  key: string
  src: string | null
  name: string
}

const cells = computed((): Cell[] =>
  heroSlots(props.teamIds).map((id, idx) => {
    const key = `${props.tone}-${props.matchId}-${idx}-${id ?? 'empty'}`
    if (!id) {
      return { key, src: null, name: '' }
    }
    const entry = HEROES_BY_ID[String(id)]
    const src = steamAssetUrl(entry?.img)
    return {
      key,
      src,
      name: entry?.localized_name || `Hero ${id}`,
    }
  }),
)
</script>

<template>
  <div
    class="matches-v2__side"
    :class="{ 'matches-v2__side--dire': tone === 'dire' }"
  >
    <span class="matches-v2__side-label" :data-tone="tone">{{ label }}</span>
    <div
      class="matches-v2__heroes"
      :class="{ 'matches-v2__heroes--dire': tone === 'dire' }"
      role="group"
      :aria-label="label"
    >
      <template v-for="cell in cells" :key="cell.key">
        <img
          v-if="cell.src"
          :src="cell.src"
          alt=""
          width="64"
          height="36"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          :title="cell.name"
        />
        <span v-else class="matches-v2__hero-slot" aria-hidden="true" />
      </template>
    </div>
  </div>
</template>
