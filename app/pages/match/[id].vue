<script setup lang="ts">
import { isNum } from '#shared/match'

const route = useRoute()
const store = useMatchStore()
const { t, locale } = useI18n()

const matchId = computed(() => String(route.params.id || ''))

const dateLocale = computed(() => (locale.value === 'uk' ? 'uk-UA' : 'en-US'))

useSeoMeta({
  title: () =>
    matchId.value
      ? t('seo.matchTitle', { id: matchId.value })
      : t('seo.matchTitleFallback'),
  description: () => t('seo.matchDescription'),
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
  <AppShell v-slot="{ openPlayer }">
    <MatchSearch />
    <MatchLoading v-if="store.loading" />
    <div v-else id="result" class="result-region" aria-live="polite">
      <MatchScore>
        <MatchScoreboard @player="openPlayer" />
        <div
          v-if="store.match && store.match.players.length !== 10"
          class="data-note"
        >
          <Icon name="lucide:info" aria-hidden="true" />
          {{ t('notes.partialPlayers', { count: store.match.players.length }) }}
        </div>
      </MatchScore>
      <MatchInsights @player="openPlayer" />
      <div
        v-if="store.match && store.source && store.source.kind !== 'live'"
        class="data-note"
      >
        <Icon name="lucide:info" aria-hidden="true" />
        <span>
          {{
            t('notes.snapshot', {
              when: new Date(store.source?.fetchedAt ?? '').toLocaleString(
                dateLocale,
              ),
            })
          }}
          <a
            :href="`https://www.opendota.com/matches/${store.match.match_id}`"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('notes.opendotaLink') }}</a
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
        <Icon name="lucide:info" aria-hidden="true" />
        {{ t('notes.basicParse') }}
      </div>
    </div>
  </AppShell>
</template>
