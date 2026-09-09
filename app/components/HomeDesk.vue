<script setup lang="ts">
import { duration } from '#shared/match'
import type { RecentMatch, SavedMatch } from '#shared/match/types'
import { formatRelativeOpened, savedResultLabel } from '~/utils/matchFormat'

const { t } = useI18n()
const store = useMatchStore()

onMounted(() => {
  store.prepareHome()
})

const hasDesk = computed(
  () => store.recent.length > 0 || store.saved.length > 0,
)

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
  <div v-if="hasDesk" class="home-desk">
    <section
      v-if="store.recent.length"
      class="home-block"
      aria-labelledby="home-recent-title"
    >
      <div class="home-block-head">
        <h2 id="home-recent-title">
          <AppIcon name="history" class="home-block-icon" />
          {{ t('home.recent') }}
        </h2>
        <p>{{ t('home.recentHint') }}</p>
      </div>
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
          <AppIcon name="trash" />
        </button>
      </div>
    </section>

    <section
      v-if="store.saved.length"
      class="home-block"
      aria-labelledby="home-saved-title"
    >
      <div class="home-block-head">
        <h2 id="home-saved-title">
          <AppIcon name="bookmark" class="home-block-icon" />
          {{ t('home.bookmarks') }}
        </h2>
        <p>{{ t('home.bookmarksHint') }}</p>
      </div>
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
          <AppIcon name="trash" />
        </button>
      </div>
    </section>
  </div>
</template>
