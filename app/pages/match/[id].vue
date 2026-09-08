<script setup lang="ts">
import { isNum } from '#shared/match'

const route = useRoute()
const store = useMatchStore()

const matchId = computed(() => String(route.params.id || ''))

useSeoMeta({
  title: () =>
    matchId.value
      ? `Матч #${matchId.value} — Ancient Lens`
      : 'Розбір матчу — Ancient Lens',
  description:
    'Статистика матчу Dota 2: результат, гравці, економіка та предмети. Дані OpenDota.',
})

async function syncRoute() {
  const id = matchId.value
  if (!id) {
    return
  }
  await store.bootstrapFromRoute(id, route.query.snapshot === '1')
}

onMounted(() => {
  void syncRoute()
})

watch(
  () => [route.params.id, route.query.snapshot] as const,
  () => {
    void syncRoute()
  },
)
</script>

<template>
  <AppShell v-slot="{ openPlayer, openItem }">
    <MatchSearch />
    <MatchLoading v-if="store.loading" />
    <div v-else id="result" class="result-region" aria-live="polite">
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
          {{ new Date(store.source?.fetchedAt ?? '').toLocaleString('uk-UA') }}.
          Щоб отримати свіжі дані, натисніть «Відкрити матч» або кнопку
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
  </AppShell>
</template>
