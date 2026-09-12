<script setup lang="ts">
import {
  clusterRegionId,
  duration,
  matchPassesFacet,
  parseRankTier,
  sortPublicMatches,
  type PublicMatchFacet,
  type PublicMatchSortDir,
  type PublicMatchSortKey,
  type PublicMatchSummary,
} from '#shared/match'
import {
  clusterLabel,
  formatRelativeUnix,
  gameModeLabel,
  lobbyLabel,
  lobbyTone,
  gameModeTone,
} from '~/utils/matchFormat'
import { fetchPublicMatchesFeed } from '~/utils/publicMatchesFeed'

const FACET_IDS: PublicMatchFacet[] = [
  'all',
  'ranked',
  'unranked',
  'turbo',
  'allPick',
  'long',
]

const SORT_KEYS: PublicMatchSortKey[] = ['time', 'rank']
const SORT_DIRS: PublicMatchSortDir[] = ['asc', 'desc']

const { t } = useI18n()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()
const route = useRoute()
const router = useRouter()

const title = computed(() => t('matchesPage.title'))
const description = computed(() => t('matchesPage.description'))

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

const loadError = ref(false)
const refreshFailed = ref(false)

function parseFacetQuery(raw: unknown): PublicMatchFacet {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (
    typeof value === 'string' &&
    FACET_IDS.includes(value as PublicMatchFacet)
  ) {
    return value as PublicMatchFacet
  }
  return 'all'
}

function parseSortKeyQuery(raw: unknown): PublicMatchSortKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (
    typeof value === 'string' &&
    SORT_KEYS.includes(value as PublicMatchSortKey)
  ) {
    return value as PublicMatchSortKey
  }
  return 'time'
}

function parseSortDirQuery(raw: unknown): PublicMatchSortDir {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (
    typeof value === 'string' &&
    SORT_DIRS.includes(value as PublicMatchSortDir)
  ) {
    return value as PublicMatchSortDir
  }
  return 'desc'
}

function patchQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (key in patch && patch[key] == null) {
      continue
    }
    if (typeof value === 'string') {
      next[key] = value
    } else if (Array.isArray(value)) {
      next[key] = value.filter(
        (part): part is string => typeof part === 'string',
      )
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value != null) {
      next[key] = value
    }
  }
  void router.replace({ query: next })
}

const facet = computed({
  get: () => parseFacetQuery(route.query.facet),
  set: (next: PublicMatchFacet) => {
    patchQuery({ facet: next === 'all' ? undefined : next })
  },
})

const sortKey = computed({
  get: () => parseSortKeyQuery(route.query.sort),
  set: (next: PublicMatchSortKey) => {
    patchQuery({ sort: next === 'time' ? undefined : next })
  },
})

const sortDir = computed({
  get: () => parseSortDirQuery(route.query.order),
  set: (next: PublicMatchSortDir) => {
    patchQuery({ order: next === 'desc' ? undefined : next })
  },
})

const {
  data: rows,
  pending,
  refresh,
  status,
} = await useAsyncData(
  'public-matches',
  async () => {
    loadError.value = false
    refreshFailed.value = false
    try {
      return await fetchPublicMatchesFeed({ timeout: 12_000 })
    } catch (err: unknown) {
      // Keep the current feed on refresh failure (stale-while-revalidate).
      if ((rows.value?.length ?? 0) > 0) {
        refreshFailed.value = true
        throw err instanceof Error
          ? err
          : new Error('public-matches fetch failed')
      }
      loadError.value = true
      return []
    }
  },
  { server: false },
)

const hasRows = computed(() => (rows.value?.length ?? 0) > 0)

/** First paint only — never replace an existing feed with the skeleton. */
const showInitialLoading = computed(
  () =>
    !hasRows.value &&
    (pending.value || status.value === 'idle' || status.value === 'pending'),
)

/** Covers network pending + a short floor so a fast refresh still feels intentional. */
const refreshBusy = ref(false)
const refreshJustDone = ref(false)
let refreshDoneTimer: ReturnType<typeof setTimeout> | null = null

const isRefreshing = computed(
  () => refreshBusy.value || (hasRows.value && pending.value),
)

const REFRESH_MIN_MS = 480
const REFRESH_DONE_MS = 1600

async function onRefresh() {
  if (showInitialLoading.value || refreshBusy.value) {
    return
  }
  refreshFailed.value = false
  refreshJustDone.value = false
  if (refreshDoneTimer) {
    clearTimeout(refreshDoneTimer)
    refreshDoneTimer = null
  }
  refreshBusy.value = true
  const started = Date.now()
  try {
    await refresh()
  } finally {
    const wait = REFRESH_MIN_MS - (Date.now() - started)
    if (wait > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, wait)
      })
    }
    refreshBusy.value = false
    if (!refreshFailed.value) {
      refreshJustDone.value = true
      refreshDoneTimer = setTimeout(() => {
        refreshJustDone.value = false
        refreshDoneTimer = null
      }, REFRESH_DONE_MS)
    }
  }
}

onBeforeUnmount(() => {
  if (refreshDoneTimer) {
    clearTimeout(refreshDoneTimer)
  }
})

const errorTitle = computed(() =>
  loadError.value ? t('matchesPage.sourceUnavailableTitle') : '',
)

const errorMessage = computed(() =>
  loadError.value ? t('matchesPage.sourceUnavailableBody') : '',
)

const showEmptySourceAlert = computed(() => loadError.value && !hasRows.value)

const filtered = computed(() =>
  (rows.value || []).filter((row) => matchPassesFacet(row, facet.value)),
)

const sorted = computed(() =>
  sortPublicMatches(filtered.value, sortKey.value, sortDir.value),
)

function facetCount(id: PublicMatchFacet) {
  const list = rows.value || []
  if (id === 'all') {
    return list.length
  }
  return list.filter((row) => matchPassesFacet(row, id)).length
}

const facets = computed(() => {
  const catalog: Array<{ id: PublicMatchFacet; label: string }> = [
    { id: 'all', label: t('matchesPage.facetAll') },
    { id: 'ranked', label: t('matchesPage.facetRanked') },
    { id: 'unranked', label: t('matchesPage.facetUnranked') },
    { id: 'turbo', label: t('matchesPage.facetTurbo') },
    { id: 'allPick', label: t('matchesPage.facetAllPick') },
    { id: 'long', label: t('matchesPage.facetLong') },
  ]
  return catalog
    .map((entry) => ({ ...entry, count: facetCount(entry.id) }))
    .filter((entry) => entry.id === 'all' || entry.count > 0)
})

const sortOptions = computed(() => [
  { id: 'time' as const, label: t('matchesPage.sortTime') },
  { id: 'rank' as const, label: t('matchesPage.sortRank') },
])

watch(
  () => [rows.value, facet.value] as const,
  () => {
    if (facet.value === 'all') {
      return
    }
    if (facetCount(facet.value) === 0) {
      facet.value = 'all'
    }
  },
)

const showingLabel = computed(() => {
  if (facet.value === 'all') {
    return ''
  }
  return t('matchesPage.showing', {
    shown: filtered.value.length,
    total: (rows.value || []).length,
  })
})

function matchPath(id: number | string) {
  return localePath({ name: 'match-id', params: { id: String(id) } })
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

function resultShort(row: PublicMatchSummary) {
  if (row.radiant_win === true) {
    return t('matchesPage.radiantWin')
  }
  if (row.radiant_win === false) {
    return t('matchesPage.direWin')
  }
  return t('format.emDash')
}

function regionText(row: PublicMatchSummary) {
  if (clusterRegionId(row.cluster) == null) {
    return ''
  }
  return clusterLabel(row.cluster)
}

function lobbyClass(row: PublicMatchSummary) {
  const tone = lobbyTone(row.lobby_type)
  return tone ? `tone-${tone}` : undefined
}

function modeClass(row: PublicMatchSummary) {
  const tone = gameModeTone(row.game_mode)
  return tone ? `tone-${tone}` : undefined
}

function setFacet(next: PublicMatchFacet) {
  facet.value = next
}

function setSort(next: PublicMatchSortKey) {
  const query = { ...route.query }
  if (sortKey.value === next) {
    const nextDir: PublicMatchSortDir =
      sortDir.value === 'desc' ? 'asc' : 'desc'
    if (nextDir === 'desc') {
      delete query.order
    } else {
      query.order = nextDir
    }
  } else {
    if (next === 'time') {
      delete query.sort
    } else {
      query.sort = next
    }
    delete query.order
  }
  void router.replace({ query })
}

function sortAria(key: PublicMatchSortKey) {
  const dir = sortKey.value === key ? sortDir.value : 'desc'
  if (key === 'time') {
    return dir === 'desc'
      ? t('matchesPage.sortTimeDesc')
      : t('matchesPage.sortTimeAsc')
  }
  return dir === 'desc'
    ? t('matchesPage.sortRankDesc')
    : t('matchesPage.sortRankAsc')
}

const skeletonSlots = [0, 1, 2, 3]
const heroSkelSlots = [0, 1, 2, 3, 4]
</script>

<template>
  <AppShell>
    <div class="matches-v2">
      <header class="matches-v2__head">
        <div class="matches-v2__titles">
          <h1>{{ title }}</h1>
          <p class="matches-v2__lead">{{ t('matchesPage.lead') }}</p>
        </div>
        <div class="matches-v2__actions">
          <button
            type="button"
            class="text-button matches-v2__refresh ui-press"
            :class="{ 'is-done': refreshJustDone }"
            :disabled="showInitialLoading || isRefreshing"
            :aria-busy="isRefreshing ? 'true' : undefined"
            @click="onRefresh()"
          >
            <Icon
              :name="refreshJustDone ? 'lucide:check' : 'lucide:refresh-cw'"
              class="matches-v2__refresh-icon"
              :class="{ 'is-spinning': isRefreshing }"
              aria-hidden="true"
            />
            {{
              refreshJustDone
                ? t('matchesPage.refreshed')
                : t('matchesPage.refresh')
            }}
          </button>
        </div>
      </header>

      <div
        v-if="showInitialLoading"
        class="matches-v2__skeleton"
        aria-busy="true"
        :aria-label="t('matchesPage.loading')"
      >
        <div
          v-for="slot in skeletonSlots"
          :key="slot"
          class="matches-v2__bout matches-v2__bout--skel"
        >
          <div class="matches-v2__slip matches-v2__slip--skel">
            <div class="matches-v2__skel-signal">
              <div class="matches-v2__skel-rank" />
              <div class="matches-v2__skel-signal-copy">
                <div
                  class="matches-v2__skel-line matches-v2__skel-line--rank"
                />
                <div
                  class="matches-v2__skel-line matches-v2__skel-line--game"
                />
              </div>
            </div>
            <div class="matches-v2__skel-draft">
              <div class="matches-v2__skel-heroes">
                <span
                  v-for="hero in heroSkelSlots"
                  :key="`r-${hero}`"
                  class="matches-v2__skel-hero"
                />
              </div>
              <div class="matches-v2__skel-spine" />
              <div
                class="matches-v2__skel-heroes matches-v2__skel-heroes--dire"
              >
                <span
                  v-for="hero in heroSkelSlots"
                  :key="`d-${hero}`"
                  class="matches-v2__skel-hero"
                />
              </div>
            </div>
            <div class="matches-v2__skel-aside">
              <div class="matches-v2__skel-line matches-v2__skel-line--aside" />
              <div class="matches-v2__skel-line matches-v2__skel-line--aside" />
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="showEmptySourceAlert"
        class="error-box matches-v2__source-alert"
        role="alert"
      >
        <div class="matches-v2__source-alert-meta">
          <Icon
            name="lucide:cloud-off"
            class="matches-v2__source-alert-icon"
            aria-hidden="true"
          />
          <span class="matches-v2__source-alert-tag">{{
            t('matchesPage.sourceUnavailableTag')
          }}</span>
          <span class="matches-v2__source-alert-source">OpenDota</span>
        </div>
        <strong>{{ errorTitle }}</strong>
        <p>{{ errorMessage }}</p>
        <div class="error-actions">
          <button type="button" class="ui-press" @click="refresh()">
            {{ t('matchesPage.retry') }}
          </button>
          <a
            class="ui-press"
            href="https://www.opendota.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t('matchesPage.sourceOpen') }}
          </a>
        </div>
      </div>
      <template v-else>
        <div class="matches-v2__toolbar">
          <div class="matches-v2__toolbar-start">
            <div
              class="matches-v2__facets"
              role="group"
              :aria-label="t('matchesPage.facetsLabel')"
            >
              <button
                v-for="entry in facets"
                :key="entry.id"
                type="button"
                class="matches-v2__facet ui-press"
                :aria-pressed="facet === entry.id"
                @click="setFacet(entry.id)"
              >
                <span>{{ entry.label }}</span>
                <span class="matches-v2__facet-count">{{ entry.count }}</span>
              </button>
            </div>
            <p
              v-if="showingLabel"
              class="matches-v2__showing"
              role="status"
              aria-atomic="true"
            >
              {{ showingLabel }}
            </p>
          </div>
          <div
            class="matches-v2__sorts"
            role="group"
            :aria-label="t('matchesPage.sortLabel')"
          >
            <button
              v-for="entry in sortOptions"
              :key="entry.id"
              type="button"
              class="matches-v2__facet matches-v2__sort ui-press"
              :aria-pressed="sortKey === entry.id"
              :aria-label="sortAria(entry.id)"
              @click="setSort(entry.id)"
            >
              <span>{{ entry.label }}</span>
              <Icon
                v-if="sortKey === entry.id"
                :name="
                  sortDir === 'desc' ? 'lucide:arrow-down' : 'lucide:arrow-up'
                "
                class="matches-v2__sort-dir"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <p v-if="!(rows && rows.length)" class="matches-v2__status">
          {{ t('matchesPage.emptyBatch') }}
        </p>
        <div v-else-if="!filtered.length" class="matches-v2__status">
          <p>{{ t('matchesPage.empty') }}</p>
          <button type="button" class="text-button" @click="setFacet('all')">
            {{ t('matchesPage.clearFacet') }}
          </button>
        </div>
        <ol
          v-else
          class="matches-v2__feed"
          :class="{
            'is-refreshing': isRefreshing,
            'is-refreshed': refreshJustDone,
          }"
          :aria-busy="isRefreshing ? 'true' : undefined"
        >
          <li
            v-for="row in sorted"
            :key="row.match_id"
            v-memo="[row.match_id, facet, sortKey, sortDir]"
          >
            <NuxtLink
              class="matches-v2__bout ui-press-row"
              :to="matchPath(row.match_id)"
              :aria-label="
                t('matchesPage.openAria', {
                  id: row.match_id,
                  result: resultShort(row),
                  mode: gameModeLabel(row.game_mode),
                })
              "
            >
              <div class="matches-v2__slip">
                <div class="matches-v2__signal">
                  <MatchRankMark
                    v-if="parseRankTier(row.avg_rank_tier)"
                    size="feature"
                    :rank-tier="row.avg_rank_tier"
                    :sample-size="row.num_rank_tier"
                  >
                    <template #below>
                      <div class="matches-v2__game">
                        <span
                          class="matches-v2__lobby"
                          :class="lobbyClass(row)"
                          >{{ lobbyLabel(row.lobby_type) }}</span
                        >
                        <span
                          class="matches-v2__mode"
                          :class="modeClass(row)"
                          >{{ gameModeLabel(row.game_mode) }}</span
                        >
                      </div>
                    </template>
                  </MatchRankMark>
                  <div v-else class="matches-v2__game matches-v2__game--solo">
                    <span class="matches-v2__lobby" :class="lobbyClass(row)">{{
                      lobbyLabel(row.lobby_type)
                    }}</span>
                    <span class="matches-v2__mode" :class="modeClass(row)">{{
                      gameModeLabel(row.game_mode)
                    }}</span>
                  </div>
                </div>

                <div class="matches-v2__match">
                  <div class="matches-v2__draft">
                    <MatchPublicHeroStrip
                      :team-ids="row.radiant_team"
                      :label="t('matchesPage.colRadiant')"
                      tone="radiant"
                      :match-id="row.match_id"
                    />

                    <div
                      class="matches-v2__spine"
                      :data-tone="resultTone(row) || undefined"
                    >
                      <span class="matches-v2__winner">{{
                        resultShort(row)
                      }}</span>
                      <span class="matches-v2__clock">{{
                        duration(row.duration)
                      }}</span>
                    </div>

                    <MatchPublicHeroStrip
                      :team-ids="row.dire_team"
                      :label="t('matchesPage.colDire')"
                      tone="dire"
                      :match-id="row.match_id"
                    />
                  </div>
                </div>

                <div class="matches-v2__aside">
                  <span class="matches-v2__when">{{
                    formatRelativeUnix(row.start_time)
                  }}</span>
                  <span v-if="regionText(row)" class="matches-v2__region">{{
                    regionText(row)
                  }}</span>
                  <span class="matches-v2__id">#{{ row.match_id }}</span>
                </div>
              </div>
            </NuxtLink>
          </li>
        </ol>
      </template>

      <div class="matches-v2__search">
        <MatchSearch embedded />
      </div>
    </div>
  </AppShell>
</template>
