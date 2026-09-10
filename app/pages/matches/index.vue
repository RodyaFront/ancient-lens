<script setup lang="ts">
import {
  clusterRegionId,
  duration,
  HEROES_BY_ID,
  matchPassesFacet,
  parseRankTier,
  type PublicMatchFacet,
  type PublicMatchSummary,
} from '#shared/match'
import {
  clusterLabel,
  formatRelativeUnix,
  gameModeLabel,
  lobbyLabel,
  lobbyTone,
  gameModeTone,
  steamAssetUrl,
} from '~/utils/matchFormat'

const FACET_IDS: PublicMatchFacet[] = [
  'all',
  'ranked',
  'unranked',
  'turbo',
  'allPick',
  'long',
]

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

const loadError = ref<'rate' | 'generic' | null>(null)

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

const facet = computed({
  get: () => parseFacetQuery(route.query.facet),
  set: (next: PublicMatchFacet) => {
    const query = { ...route.query }
    if (next === 'all') {
      delete query.facet
    } else {
      query.facet = next
    }
    void router.replace({ query })
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

const filtered = computed(() =>
  (rows.value || []).filter((row) => matchPassesFacet(row, facet.value)),
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

const skeletonSlots = [0, 1, 2, 3]
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
            class="text-button"
            :disabled="showLoading"
            @click="refresh()"
          >
            {{ t('matchesPage.refresh') }}
          </button>
        </div>
      </header>

      <div
        v-if="showLoading"
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
              <div class="matches-v2__skel-heroes" />
              <div class="matches-v2__skel-spine" />
              <div class="matches-v2__skel-heroes" />
            </div>
            <div class="matches-v2__skel-aside">
              <div class="matches-v2__skel-line matches-v2__skel-line--aside" />
              <div class="matches-v2__skel-line matches-v2__skel-line--aside" />
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="loadError" class="matches-v2__status" role="alert">
        <p>
          <strong>{{ errorTitle }}</strong>
        </p>
        <p>{{ errorMessage }}</p>
        <button type="button" class="text-button" @click="refresh()">
          {{ t('matchesPage.retry') }}
        </button>
      </div>
      <template v-else>
        <div class="matches-v2__toolbar">
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

        <p v-if="!(rows && rows.length)" class="matches-v2__status">
          {{ t('matchesPage.emptyBatch') }}
        </p>
        <div v-else-if="!filtered.length" class="matches-v2__status">
          <p>{{ t('matchesPage.empty') }}</p>
          <button type="button" class="text-button" @click="setFacet('all')">
            {{ t('matchesPage.clearFacet') }}
          </button>
        </div>
        <ol v-else class="matches-v2__feed">
          <li
            v-for="row in filtered"
            :key="row.match_id"
            v-memo="[row.match_id, facet]"
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
                    <div class="matches-v2__side">
                      <span
                        class="matches-v2__side-label"
                        data-tone="radiant"
                        >{{ t('matchesPage.colRadiant') }}</span
                      >
                      <div
                        class="matches-v2__heroes"
                        role="group"
                        :aria-label="t('matchesPage.colRadiant')"
                      >
                        <img
                          v-for="(id, idx) in heroIds(row.radiant_team)"
                          :key="`r-${row.match_id}-${idx}-${id}`"
                          :src="heroImg(id)"
                          alt=""
                          width="64"
                          height="36"
                          loading="lazy"
                          decoding="async"
                          aria-hidden="true"
                          :title="heroName(id)"
                        />
                      </div>
                    </div>

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

                    <div class="matches-v2__side matches-v2__side--dire">
                      <span class="matches-v2__side-label" data-tone="dire">{{
                        t('matchesPage.colDire')
                      }}</span>
                      <div
                        class="matches-v2__heroes matches-v2__heroes--dire"
                        role="group"
                        :aria-label="t('matchesPage.colDire')"
                      >
                        <img
                          v-for="(id, idx) in heroIds(row.dire_team)"
                          :key="`d-${row.match_id}-${idx}-${id}`"
                          :src="heroImg(id)"
                          alt=""
                          width="64"
                          height="36"
                          loading="lazy"
                          decoding="async"
                          aria-hidden="true"
                          :title="heroName(id)"
                        />
                      </div>
                    </div>
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
