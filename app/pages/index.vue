<script setup lang="ts">
const { t } = useI18n()
const siteConfig = useSiteConfig()

const ogImage = computed(() => {
  const base = String(siteConfig.url || 'https://ancientlens.info').replace(
    /\/$/,
    '',
  )
  return `${base}/og-default.png`
})

useSeoMeta({
  title: () => t('seo.siteTitle'),
  description: () => t('seo.siteDescription'),
  ogImage: () => ogImage.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
})
</script>

<template>
  <AppShell>
    <MatchSearch />
    <HomeDesk />
  </AppShell>
</template>
