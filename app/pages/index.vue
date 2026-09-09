<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('seo.siteTitle'),
  description: () => t('seo.siteDescription'),
})
</script>

<template>
  <AppShell>
    <MatchSearch />
    <HomeDesk />
  </AppShell>
</template>
