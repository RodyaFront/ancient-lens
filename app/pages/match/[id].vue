<script setup lang="ts">
import { buildMatchSeoCopy, isNum, type SeoLocale } from '#shared/match'

const route = useRoute()
const store = useMatchStore()
const { t, locale } = useI18n()
const siteConfig = useSiteConfig()

const matchId = computed(() => String(route.params.id || ''))

const dateLocale = computed(() => (locale.value === 'uk' ? 'uk-UA' : 'en-US'))

const seoLocale = computed<SeoLocale>(() =>
  locale.value === 'uk' ? 'uk' : 'en',
)

const seoCopy = computed(() => {
  const heroes: Record<string, { localized_name?: string }> = {}
  for (const player of store.match?.players ?? []) {
    if (!isNum(player.hero_id)) {
      continue
    }
    const entry = store.heroById(player.hero_id)
    if (entry) {
      heroes[String(player.hero_id)] = entry
    }
  }
  return buildMatchSeoCopy(store.match, {
    matchId: matchId.value || '0',
    locale: seoLocale.value,
    heroes,
  })
})

const ogImage = computed(() => {
  const base = String(siteConfig.url || 'https://ancientlens.info').replace(
    /\/$/,
    '',
  )
  return `${base}/og-default.png`
})

useSeoMeta({
  title: () =>
    store.match
      ? seoCopy.value.title
      : matchId.value
        ? t('seo.matchTitle', { id: matchId.value })
        : t('seo.matchTitleFallback'),
  description: () =>
    store.match ? seoCopy.value.description : t('seo.matchDescription'),
  ogTitle: () =>
    store.match
      ? seoCopy.value.title
      : matchId.value
        ? t('seo.matchTitle', { id: matchId.value })
        : t('seo.matchTitleFallback'),
  ogDescription: () =>
    store.match ? seoCopy.value.description : t('seo.matchDescription'),
  ogImage: () => ogImage.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
  robots: () =>
    route.query.snapshot === '1' ? 'noindex, nofollow' : 'index, follow',
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
