<script setup lang="ts">
const { t } = useI18n()

const title = computed(() => t('aboutPage.title'))
const description = computed(() => t('aboutPage.description'))
const lead = computed(() => t('aboutPage.lead'))
</script>

<template>
  <SeoHub
    :title="title"
    :description="description"
    :lead="lead"
    :show-examples="false"
  >
    <section class="seo-hub__section">
      <h2>{{ t('aboutPage.s1Title') }}</h2>
      <p>{{ t('aboutPage.s1Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('aboutPage.s2Title') }}</h2>
      <p>{{ t('aboutPage.s2Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('aboutPage.s3Title') }}</h2>
      <p>{{ t('aboutPage.s3Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('aboutPage.s4Title') }}</h2>
      <p>{{ t('aboutPage.s4Body') }}</p>
    </section>
  </SeoHub>
</template>
