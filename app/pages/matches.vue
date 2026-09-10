<script setup lang="ts">
import {
  clusterRegionId,
  duration,
  HEROES_BY_ID,
  type PublicMatchSummary,
} from '#shared/match'
import {
  clusterLabel,
  formatRelativeUnix,
  gameModeLabel,
  lobbyLabel,
  lobbyTone,
  steamAssetUrl,
} from '~/utils/matchFormat'

const { t } = useI18n()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()
const router = useRouter()

const title = computed(() => t('matchesPage.title'))
const description = computed(() => t('matchesPage.description'))
const lead = computed(() => t('matchesPage.lead'))

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
})

const loadError = ref<'rate' | 'generic' | null>(null)

const {
  data: rows,
  pending,
  refresh,
  status,
} = await useAsyncData(
  'public-matches',
  async () => {
    loadError.value = null
    try {
      const list = await $fetch<PublicMatchSummary[]>('/api/public-matches', {
        timeout: 12_000,
      })
      return Array.isArray(list) ? list : []
    } catch (err: unknown) {
      const statusCode =
        typeof err === 'object' &&
        err &&
        'statusCode' in err &&
        typeof (err as { statusCode?: unknown }).statusCode === 'number'
          ? (err as { statusCode: number }).statusCode
          : typeof err === 'object' &&
              err &&
              'status' in err &&
              typeof (err as { status?: unknown }).status === 'number'
            ? (err as { status: number }).status
            : 0
      loadError.value = statusCode === 429 ? 'rate' : 'generic'
      // Do not rethrow — Nuxt would paint a fatal overlay over the page.
      return []
    }
  },
  { server: false },
)

const showLoading = computed(
  () => pending.value || status.value === 'idle' || status.value === 'pending',
)

const errorMessage = computed(() => {
  if (loadError.value === 'rate') {
    return t('errors.rateLimitBody', { when: t('errors.rateLimitSoon') })
  }
  if (loadError.value === 'generic') {
    return t('matchesPage.error')
  }
  return ''
})

const errorTitle = computed(() =>
  loadError.value === 'rate'
    ? t('errors.rateLimitTitle')
    : t('matchesPage.error'),
)

const maxDuration = computed(() => {
  const list = rows.value || []
  let max = 1
  for (const row of list) {
    if (typeof row.duration === 'number' && row.duration > max) {
      max = row.duration
    }
  }
  return max
})

function matchPath(id: number | string) {
  return localePath({ name: 'match-id', params: { id: String(id) } })
}

function openMatch(id: number | string) {
  return router.push(matchPath(id))
}

function onRowActivate(event: MouseEvent | KeyboardEvent, id: number) {
  const target = event.target
  if (
    target instanceof Element &&
    target.closest('a, button, input, textarea, select, label')
  ) {
    return
  }
  void openMatch(id)
}

function resultLabel(row: PublicMatchSummary) {
  if (row.radiant_win === true) {
    return t('matchesPage.radiantWin')
  }
  if (row.radiant_win === false) {
    return t('matchesPage.direWin')
  }
  return t('format.emDash')
}

function resultTone(row: PublicMatchSummary): 'radiant' | 'dire' | null {
  if (row.radiant_win === true) {
    return 'radiant'
  }
  if (row.radiant_win === false) {
    return 'dire'
  }
  return null
}

function durationPct(seconds: number | undefined) {
  if (typeof seconds !== 'number' || seconds <= 0) {
    return 0
  }
  return Math.min(100, Math.round((seconds / maxDuration.value) * 100))
}

function heroIds(ids: number[] | undefined) {
  return (ids || [])
    .filter((id) => typeof id === 'number' && id > 0)
    .slice(0, 5)
}

function heroImg(heroId: number) {
  return steamAssetUrl(HEROES_BY_ID[String(heroId)]?.img) || undefined
}

function heroName(heroId: number) {
  return HEROES_BY_ID[String(heroId)]?.localized_name || `Hero ${heroId}`
}

function lobbyClass(row: PublicMatchSummary) {
  const tone = lobbyTone(row.lobby_type)
  return tone ? `tone-${tone}` : undefined
}

function regionText(row: PublicMatchSummary) {
  if (clusterRegionId(row.cluster) == null) {
    return ''
  }
  return clusterLabel(row.cluster)
}
</script>

<template>
  <AppShell>
    <div class="matches-page">
      <header class="matches-page__head">
        <div class="matches-page__titles">
          <h1>{{ title }}</h1>
          <p>{{ lead }}</p>
        </div>
        <button
          type="button"
          class="text-button matches-page__refresh"
          :disabled="showLoading"
          @click="refresh()"
        >
          {{ t('matchesPage.refresh') }}
        </button>
      </header>

      <p v-if="showLoading" class="matches-page__status">
        {{ t('matchesPage.loading') }}
      </p>
      <div v-else-if="loadError" class="matches-page__status" role="alert">
        <p>
          <strong>{{ errorTitle }}</strong>
        </p>
        <p>{{ errorMessage }}</p>
        <button type="button" class="text-button" @click="refresh()">
          {{ t('matchesPage.retry') }}
        </button>
      </div>
      <div v-else-if="!(rows && rows.length)" class="matches-page__status">
        {{ t('matchesPage.empty') }}
      </div>
      <div v-else class="table-scroll matches-page__scroll">
        <table class="matches-list">
          <thead>
            <tr>
              <th scope="col">{{ t('matchesPage.colId') }}</th>
              <th scope="col">{{ t('matchesPage.colMode') }}</th>
              <th scope="col">{{ t('matchesPage.colResult') }}</th>
              <th scope="col">{{ t('matchesPage.colDuration') }}</th>
              <th scope="col">{{ t('matchesPage.colRadiant') }}</th>
              <th scope="col">{{ t('matchesPage.colDire') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.match_id"
              class="matches-list__row"
              @click="onRowActivate($event, row.match_id)"
            >
              <td>
                <div class="matches-list__stack matches-list__match">
                  <NuxtLink
                    class="matches-list__id"
                    :to="matchPath(row.match_id)"
                  >
                    {{ row.match_id }}
                  </NuxtLink>
                  <span class="matches-list__when">{{
                    formatRelativeUnix(row.start_time)
                  }}</span>
                </div>
              </td>
              <td>
                <div class="matches-list__stack matches-list__mode">
                  <span>{{ gameModeLabel(row.game_mode) }}</span>
                  <span class="matches-list__lobby" :class="lobbyClass(row)">{{
                    lobbyLabel(row.lobby_type)
                  }}</span>
                </div>
              </td>
              <td>
                <div class="matches-list__stack matches-list__result">
                  <span
                    class="matches-list__winner"
                    :data-tone="resultTone(row) || undefined"
                    >{{ resultLabel(row) }}</span
                  >
                  <span v-if="regionText(row)" class="matches-list__region">{{
                    regionText(row)
                  }}</span>
                </div>
              </td>
              <td>
                <div class="matches-list__duration">
                  <span class="matches-list__clock">{{
                    duration(row.duration)
                  }}</span>
                  <span
                    class="matches-list__bar"
                    role="presentation"
                    :style="{ '--pct': `${durationPct(row.duration)}%` }"
                  />
                </div>
              </td>
              <td>
                <ul
                  class="matches-list__heroes"
                  :aria-label="t('matchesPage.colRadiant')"
                >
                  <li
                    v-for="(id, idx) in heroIds(row.radiant_team)"
                    :key="`r-${row.match_id}-${idx}-${id}`"
                  >
                    <img
                      :src="heroImg(id)"
                      :alt="heroName(id)"
                      width="48"
                      height="27"
                      loading="lazy"
                      decoding="async"
                    />
                  </li>
                </ul>
              </td>
              <td>
                <ul
                  class="matches-list__heroes"
                  :aria-label="t('matchesPage.colDire')"
                >
                  <li
                    v-for="(id, idx) in heroIds(row.dire_team)"
                    :key="`d-${row.match_id}-${idx}-${id}`"
                  >
                    <img
                      :src="heroImg(id)"
                      :alt="heroName(id)"
                      width="48"
                      height="27"
                      loading="lazy"
                      decoding="async"
                    />
                  </li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="matches-page__search">
        <MatchSearch embedded />
      </div>
    </div>
  </AppShell>
</template>
