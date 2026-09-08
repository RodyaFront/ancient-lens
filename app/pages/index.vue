<script setup lang="ts">
import { isNum } from '#shared/match'
import type { MatchDialogState } from '#shared/match/types'

const store = useMatchStore()
const dialog = ref<MatchDialogState>(null)

useSeoMeta({
  title: 'Ancient Lens — розбір матчів Dota 2',
  description:
    'Ancient Lens — статистика матчів Dota 2: результат, гравці, економіка та предмети. Дані OpenDota.',
})

onMounted(() => {
  void store.bootstrap()
})

function openPlayer(index: number) {
  dialog.value = { kind: 'player', index }
}

function openItem(id: number) {
  dialog.value = { kind: 'item', id }
}

function openSources() {
  dialog.value = { kind: 'sources' }
}

function openSaved() {
  dialog.value = { kind: 'saved' }
}
</script>

<template>
  <div>
    <a class="skip-link" href="#match-search">Перейти до пошуку матчу</a>
    <SiteHeader @saved="openSaved" @sources="openSources" />
    <main>
      <MatchSearch />
      <MatchLoading v-if="store.loading" />
      <div v-else id="result" aria-live="polite">
        <MatchScore>
          <MatchScoreboard @player="openPlayer" @item="openItem" />
          <div
            v-if="store.match && store.match.players.length !== 10"
            class="data-note"
          >
            <AppIcon name="info" />
            OpenDota надав {{ store.match.players.length }} із 10 гравців.
            Командні підсумки охоплюють тільки доступних учасників.
          </div>
        </MatchScore>
        <MatchInsights @player="openPlayer" />
        <div
          v-if="store.match && store.source && store.source.kind !== 'live'"
          class="data-note"
        >
          <AppIcon name="info" />
          <span>
            Знімок OpenDota від
            {{
              new Date(store.source?.fetchedAt ?? '').toLocaleString('uk-UA')
            }}. Щоб отримати свіжі дані, натисніть «Відкрити матч» або кнопку
            оновлення.
            <a
              :href="`https://www.opendota.com/matches/${store.match.match_id}`"
              target="_blank"
              rel="noopener noreferrer"
              >Матч в OpenDota ↗</a
            >
          </span>
        </div>
        <div
          v-else-if="
            store.match &&
            store.source?.kind === 'live' &&
            !isNum(store.match.version)
          "
          class="data-note"
        >
          <AppIcon name="info" />
          OpenDota ще не має детально розібраного реплею. Доступні базові
          показники; відсутні дані позначені «—».
        </div>
      </div>
      <SiteFooter @sources="openSources" />
    </main>
    <MatchDialog v-model="dialog" />
    <AppToast />
  </div>
</template>
