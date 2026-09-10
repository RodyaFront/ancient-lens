<script setup lang="ts">
import { duration, OPENDOTA_API } from '#shared/match'
import { SEO_EXAMPLE_MATCH_IDS } from '#shared/seo/staticRoutes'

type PublicMatchRow = {
  match_id: number
  radiant_win?: boolean
  duration?: number
  avg_mmr?: number | null
  radiant_score?: number
  dire_score?: number
}

const { t } = useI18n()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()

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

const {
  data: rows,
  pending,
  error,
  refresh,
} = await useAsyncData(
  'public-matches',
  async () => {
    const list = await $fetch<PublicMatchRow[]>(
      `${OPENDOTA_API}/publicMatches`,
      {
        timeout: 10_000,
      },
    )
    return Array.isArray(list) ? list.slice(0, 40) : []
  },
  { server: false },
)

function matchPath(id: number | string) {
  return localePath({ name: 'match-id', params: { id: String(id) } })
}

function resultLabel(row: PublicMatchRow) {
  const score =
    typeof row.radiant_score === 'number' && typeof row.dire_score === 'number'
      ? `${row.radiant_score}:${row.dire_score}`
      : '—'
  if (row.radiant_win === true) {
    return `Radiant ${score}`
  }
  if (row.radiant_win === false) {
    return `Dire ${score}`
  }
  return score
}
</script>

<template>
  <SeoHub
    :title="title"
    :description="description"
    :lead="lead"
    :show-examples="false"
  >
    <section class="seo-hub__section" aria-labelledby="stable-examples">
      <h2 id="stable-examples">{{ t('matchesPage.examplesHeading') }}</h2>
      <ul class="seo-hub__list">
        <li v-for="id in SEO_EXAMPLE_MATCH_IDS" :key="id">
          <NuxtLink :to="matchPath(id)">#{{ id }}</NuxtLink>
        </li>
      </ul>
    </section>

    <p v-if="pending" class="seo-hub__status">{{ t('matchesPage.loading') }}</p>
    <div v-else-if="error" class="seo-hub__status" role="alert">
      <p>{{ t('matchesPage.error') }}</p>
      <button type="button" class="text-button" @click="refresh()">
        {{ t('matchesPage.retry') }}
      </button>
    </div>
    <div v-else class="table-scroll">
      <table class="seo-hub__table matches-table">
        <thead>
          <tr>
            <th scope="col">{{ t('matchesPage.colId') }}</th>
            <th scope="col">{{ t('matchesPage.colScore') }}</th>
            <th scope="col">{{ t('matchesPage.colDuration') }}</th>
            <th scope="col">{{ t('matchesPage.colMmr') }}</th>
            <th scope="col">
              <span class="sr-only">{{ t('matchesPage.open') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows || []" :key="row.match_id">
            <td>
              <NuxtLink :to="matchPath(row.match_id)">{{
                row.match_id
              }}</NuxtLink>
            </td>
            <td>{{ resultLabel(row) }}</td>
            <td>{{ duration(row.duration) }}</td>
            <td>{{ row.avg_mmr ?? '—' }}</td>
            <td>
              <NuxtLink :to="matchPath(row.match_id)">{{
                t('matchesPage.open')
              }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </SeoHub>
</template>
