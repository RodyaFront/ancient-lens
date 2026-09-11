<script setup lang="ts">
import { duration } from '#shared/match'
import type { SavedMatch } from '#shared/match/types'
import { savedResultLabel } from '~/utils/matchFormat'

const { t } = useI18n()
const localePath = useLocalePath()
const store = useMatchStore()
const siteConfig = useSiteConfig()

const title = computed(() => t('savedPage.title'))
const description = computed(() => t('savedPage.description'))

const ogImage = computed(() => {
  const base = String(siteConfig.url || 'https://ancientlens.info').replace(
    /\/$/,
    '',
  )
  return `${base}/og-default.png`
})

useSeoMeta({
  title: () => title.value,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogImage: () => ogImage.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
  robots: 'noindex, nofollow',
})

onMounted(() => {
  store.loadSaved()
})

function openMatch(id: string) {
  void store.openMatchInput(id)
}

function savedMeta(entry: SavedMatch) {
  return `${savedResultLabel(entry)} · ${duration(entry.duration)}`
}
</script>

<template>
  <AppShell>
    <div class="saved-page">
      <header class="saved-page__head">
        <div class="saved-page__titles">
          <h1>{{ title }}</h1>
          <p class="saved-page__lead">{{ t('savedPage.lead') }}</p>
        </div>
      </header>

      <div
        v-if="!store.saved.length"
        class="saved-page__empty home-block-empty"
        role="status"
      >
        <p class="home-block-empty__copy">{{ t('savedPage.empty') }}</p>
        <NuxtLink
          class="home-block-empty__action ui-press"
          :to="localePath({ name: 'matches' })"
        >
          <Icon name="lucide:swords" aria-hidden="true" />
          {{ t('savedPage.emptyAction') }}
        </NuxtLink>
      </div>
      <div v-else class="saved-page__list" role="list">
        <div
          v-for="entry in store.saved"
          :key="entry.id"
          class="saved-row home-saved-row"
          role="listitem"
        >
          <button class="saved-open" type="button" @click="openMatch(entry.id)">
            <strong>#{{ entry.id }}</strong>
            <small>{{ savedMeta(entry) }}</small>
          </button>
          <button
            class="icon-button"
            type="button"
            :aria-label="t('savedPage.remove', { id: entry.id })"
            @click="store.removeSaved(entry.id)"
          >
            <Icon name="lucide:trash" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="saved-page__search">
        <MatchSearch embedded />
      </div>
    </div>
  </AppShell>
</template>
