<script setup lang="ts">
import {
  heroSlug,
  HEROES_BY_ID,
  listHeroesSorted,
  primaryAttrI18nKey,
  type HeroEntry,
} from '#shared/match'
import { steamAssetUrl } from '~/utils/matchFormat'

const { t } = useI18n()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()

const heroes = computed(() => listHeroesSorted(HEROES_BY_ID))

const title = computed(() => t('heroesPage.title'))
const description = computed(() => t('heroesPage.description'))
const lead = computed(() => t('heroesPage.lead'))

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

function hrefFor(entry: HeroEntry) {
  return localePath({
    name: 'heroes-slug',
    params: { slug: heroSlug(entry) },
  })
}

function attrLabel(entry: HeroEntry) {
  const key = primaryAttrI18nKey(entry.primary_attr)
  return key ? t(key) : entry.primary_attr || '—'
}
</script>

<template>
  <SeoHub
    :title="title"
    :description="description"
    :lead="lead"
    :show-examples="false"
  >
    <ul class="hero-catalog">
      <li v-for="hero in heroes" :key="hero.id">
        <NuxtLink class="hero-catalog__card" :to="hrefFor(hero)">
          <img
            :src="steamAssetUrl(hero.img) || undefined"
            :alt="hero.localized_name"
            width="64"
            height="36"
            loading="lazy"
          />
          <span class="hero-catalog__name">{{ hero.localized_name }}</span>
          <span class="hero-catalog__meta">{{ attrLabel(hero) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </SeoHub>
</template>
