<script setup lang="ts">
import {
  findHeroBySlug,
  HEROES_BY_ID,
  primaryAttrI18nKey,
  roleLine,
  type HeroEntry,
} from '#shared/match'
import { steamAssetUrl } from '~/utils/matchFormat'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const siteConfig = useSiteConfig()

const slug = computed(() => String(route.params.slug || ''))

const hero = computed(() => findHeroBySlug(HEROES_BY_ID, slug.value))

if (!hero.value) {
  throw createError({ statusCode: 404, statusMessage: 'Hero not found' })
}

const title = computed(() =>
  hero.value
    ? `${hero.value.localized_name} | Ancient Lens`
    : t('heroesPage.notFound'),
)
const description = computed(() =>
  hero.value
    ? `${hero.value.localized_name} — ${
        roleLine(hero.value).join(', ') || 'Dota 2 hero'
      }. Open a match scorebook on Ancient Lens.`
    : t('heroesPage.notFound'),
)

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

function attrLabel(entry: HeroEntry) {
  const key = primaryAttrI18nKey(entry.primary_attr)
  return key ? t(key) : entry.primary_attr || '—'
}
</script>

<template>
  <AppShell>
    <article v-if="hero" class="seo-hub">
      <p class="seo-hub__crumb">
        <NuxtLink :to="localePath({ name: 'heroes' })">{{
          t('heroesPage.back')
        }}</NuxtLink>
      </p>
      <header class="seo-hub__header hero-detail__header">
        <img
          class="hero-detail__art"
          :src="steamAssetUrl(hero.img) || undefined"
          :alt="hero.localized_name"
          width="256"
          height="144"
        />
        <div>
          <h1>{{ hero.localized_name }}</h1>
          <p class="seo-hub__lead">
            {{ t('heroesPage.attr') }}: {{ attrLabel(hero) }}
            <span v-if="roleLine(hero).length">
              · {{ t('heroesPage.roles') }}:
              {{ roleLine(hero).join(', ') }}</span
            >
          </p>
        </div>
      </header>
      <p>{{ t('heroesPage.openMatchCta') }}</p>
      <div class="seo-hub__search">
        <MatchSearch embedded />
      </div>
    </article>
    <article v-else class="seo-hub">
      <h1>{{ t('heroesPage.notFound') }}</h1>
      <NuxtLink :to="localePath({ name: 'heroes' })">{{
        t('heroesPage.back')
      }}</NuxtLink>
    </article>
  </AppShell>
</template>
