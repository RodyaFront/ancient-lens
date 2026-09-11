<script setup lang="ts">
import { duration } from '#shared/match'
import type { RecentMatch, SavedMatch } from '#shared/match/types'
import { formatRelativeOpened, savedResultLabel } from '~/utils/matchFormat'

const { t } = useI18n()
const localePath = useLocalePath()
const store = useMatchStore()

onMounted(() => {
  store.prepareHome()
})

function openMatch(id: string) {
  void store.openMatchInput(id)
}

function recentMeta(entry: RecentMatch) {
  const parts = [savedResultLabel(entry), duration(entry.duration)].filter(
    (part) => part && part !== '—',
  )
  const opened = formatRelativeOpened(entry.openedAt)
  if (opened) {
    parts.push(opened)
  }
  return parts.join(' · ')
}

function savedMeta(entry: SavedMatch) {
  return `${savedResultLabel(entry)} · ${duration(entry.duration)}`
}
</script>

<template>
  <div class="home-desk">
    <section
      class="home-block"
      data-kind="recent"
      aria-labelledby="home-recent-title"
    >
      <div class="home-block-head">
        <h2 id="home-recent-title">
          <Icon
            name="lucide:clock"
            class="home-block-icon"
            aria-hidden="true"
          />
          {{ t('home.recent') }}
        </h2>
        <p>{{ t('home.recentHint') }}</p>
      </div>
      <template v-if="store.recent.length">
        <div
          v-for="entry in store.recent"
          :key="`recent-${entry.id}`"
          class="saved-row home-saved-row"
        >
          <button class="saved-open" type="button" @click="openMatch(entry.id)">
            <strong>#{{ entry.id }}</strong>
            <small>{{ recentMeta(entry) }}</small>
          </button>
          <button
            class="icon-button"
            type="button"
            :aria-label="t('home.removeRecent', { id: entry.id })"
            @click="store.removeRecent(entry.id)"
          >
            <Icon name="lucide:trash" aria-hidden="true" />
          </button>
        </div>
      </template>
      <div v-else class="home-block-empty" role="status">
        <p class="home-block-empty__copy">{{ t('home.recentEmpty') }}</p>
        <NuxtLink
          class="home-block-empty__action ui-press"
          :to="localePath({ name: 'matches' })"
        >
          <Icon name="lucide:swords" aria-hidden="true" />
          {{ t('home.recentEmptyAction') }}
        </NuxtLink>
      </div>
    </section>

    <section
      class="home-block"
      data-kind="bookmarks"
      aria-labelledby="home-saved-title"
    >
      <div class="home-block-head">
        <h2 id="home-saved-title">
          <Icon
            name="lucide:bookmark"
            class="home-block-icon"
            aria-hidden="true"
          />
          {{ t('home.bookmarks') }}
        </h2>
        <p>{{ t('home.bookmarksHint') }}</p>
      </div>
      <template v-if="store.saved.length">
        <div
          v-for="entry in store.saved"
          :key="`saved-${entry.id}`"
          class="saved-row home-saved-row"
        >
          <button class="saved-open" type="button" @click="openMatch(entry.id)">
            <strong>#{{ entry.id }}</strong>
            <small>{{ savedMeta(entry) }}</small>
          </button>
          <button
            class="icon-button"
            type="button"
            :aria-label="t('home.removeSaved', { id: entry.id })"
            @click="store.removeSaved(entry.id)"
          >
            <Icon name="lucide:trash" aria-hidden="true" />
          </button>
        </div>
      </template>
      <div v-else class="home-block-empty" role="status">
        <p class="home-block-empty__copy">{{ t('home.bookmarksEmpty') }}</p>
      </div>
    </section>
  </div>
</template>
