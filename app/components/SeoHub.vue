<script setup lang="ts">
import { SEO_EXAMPLE_MATCH_IDS } from '#shared/seo/staticRoutes'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    lead: string
    related?: Array<{ label: string; path: string }>
    showExamples?: boolean
    showSearch?: boolean
  }>(),
  {
    related: () => [],
    showExamples: true,
    showSearch: true,
  },
)

const { t } = useI18n()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()

const ogImage = computed(() => {
  const base = String(siteConfig.url || 'https://ancientlens.info').replace(
    /\/$/,
    '',
  )
  return `${base}/og-default.png`
})

useSeoMeta({
  title: () => props.title,
  description: () => props.description,
  ogTitle: () => props.title,
  ogDescription: () => props.description,
  ogImage: () => ogImage.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
})

const defaultRelated = computed(() => [
  {
    label: t('hubs.linkReadMatch'),
    path: localePath({ name: 'guides-how-to-read-a-dota-2-match' }),
  },
  {
    label: t('hubs.linkMatchStats'),
    path: localePath({ name: 'guides-dota-2-match-stats' }),
  },
  {
    label: t('hubs.linkHeroes'),
    path: localePath({ name: 'heroes' }),
  },
  {
    label: t('hubs.linkMatches'),
    path: localePath({ name: 'matches' }),
  },
  {
    label: t('hubs.linkAbout'),
    path: localePath({ name: 'about' }),
  },
])

const relatedLinks = computed(() => {
  const seen = new Set<string>()
  return [...props.related, ...defaultRelated.value].filter((link) => {
    if (seen.has(link.path)) {
      return false
    }
    seen.add(link.path)
    return true
  })
})

function matchPath(id: string) {
  return localePath({ name: 'match-id', params: { id } })
}
</script>

<template>
  <AppShell>
    <article class="seo-hub">
      <header class="seo-hub__header">
        <h1>{{ title }}</h1>
        <p class="seo-hub__lead">{{ lead }}</p>
      </header>

      <div class="seo-hub__body">
        <slot />
      </div>

      <section
        v-if="showExamples"
        class="seo-hub__section"
        aria-labelledby="seo-examples"
      >
        <h2 id="seo-examples">{{ t('hubs.examplesHeading') }}</h2>
        <ul class="seo-hub__list">
          <li v-for="id in SEO_EXAMPLE_MATCH_IDS" :key="id">
            <NuxtLink :to="matchPath(id)">#{{ id }}</NuxtLink>
          </li>
        </ul>
      </section>

      <section class="seo-hub__section" aria-labelledby="seo-related">
        <h2 id="seo-related">{{ t('hubs.relatedHeading') }}</h2>
        <ul class="seo-hub__list">
          <li v-for="link in relatedLinks" :key="link.path">
            <NuxtLink :to="link.path">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </section>

      <div v-if="showSearch" class="seo-hub__search">
        <MatchSearch embedded />
      </div>
    </article>
  </AppShell>
</template>
