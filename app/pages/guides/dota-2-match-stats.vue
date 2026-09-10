<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const title = computed(() => t('guides.matchStats.title'))
const description = computed(() => t('guides.matchStats.description'))
const lead = computed(() => t('guides.matchStats.lead'))

const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: t('guides.matchStats.q1'),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t('guides.matchStats.a1'),
      },
    },
    {
      '@type': 'Question',
      name: t('guides.matchStats.q2'),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t('guides.matchStats.a2'),
      },
    },
  ],
}))

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      key: 'faq-match-stats',
      innerHTML: jsonLd.value,
    },
  ],
}))

const related = computed(() => [
  {
    label: t('hubs.linkCompareOpendota'),
    path: localePath({ name: 'compare-opendota' }),
  },
  {
    label: t('hubs.linkCompareDotabuff'),
    path: localePath({ name: 'compare-dotabuff' }),
  },
])
</script>

<template>
  <SeoHub
    :title="title"
    :description="description"
    :lead="lead"
    :related="related"
  >
    <section class="seo-hub__section">
      <h2>{{ t('guides.matchStats.s1Title') }}</h2>
      <p>{{ t('guides.matchStats.s1Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('guides.matchStats.s2Title') }}</h2>
      <p>{{ t('guides.matchStats.s2Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('guides.matchStats.s3Title') }}</h2>
      <p>{{ t('guides.matchStats.s3Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('guides.matchStats.s4Title') }}</h2>
      <p>{{ t('guides.matchStats.s4Body') }}</p>
    </section>
    <section class="seo-hub__section" aria-labelledby="stats-faq">
      <h2 id="stats-faq">{{ t('guides.matchStats.faqTitle') }}</h2>
      <dl class="seo-hub__faq">
        <dt>{{ t('guides.matchStats.q1') }}</dt>
        <dd>{{ t('guides.matchStats.a1') }}</dd>
        <dt>{{ t('guides.matchStats.q2') }}</dt>
        <dd>{{ t('guides.matchStats.a2') }}</dd>
      </dl>
    </section>
  </SeoHub>
</template>
