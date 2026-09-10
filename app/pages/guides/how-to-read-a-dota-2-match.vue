<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const title = computed(() => t('guides.readMatch.title'))
const description = computed(() => t('guides.readMatch.description'))
const lead = computed(() => t('guides.readMatch.lead'))

const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: t('guides.readMatch.q1'),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t('guides.readMatch.a1'),
      },
    },
    {
      '@type': 'Question',
      name: t('guides.readMatch.q2'),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t('guides.readMatch.a2'),
      },
    },
  ],
}))

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      key: 'faq-read-match',
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
      <h2>{{ t('guides.readMatch.s1Title') }}</h2>
      <p>{{ t('guides.readMatch.s1Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('guides.readMatch.s2Title') }}</h2>
      <p>{{ t('guides.readMatch.s2Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('guides.readMatch.s3Title') }}</h2>
      <p>{{ t('guides.readMatch.s3Body') }}</p>
    </section>
    <section class="seo-hub__section">
      <h2>{{ t('guides.readMatch.s4Title') }}</h2>
      <p>{{ t('guides.readMatch.s4Body') }}</p>
    </section>
    <section class="seo-hub__section" aria-labelledby="read-faq">
      <h2 id="read-faq">{{ t('guides.readMatch.faqTitle') }}</h2>
      <dl class="seo-hub__faq">
        <dt>{{ t('guides.readMatch.q1') }}</dt>
        <dd>{{ t('guides.readMatch.a1') }}</dd>
        <dt>{{ t('guides.readMatch.q2') }}</dt>
        <dd>{{ t('guides.readMatch.a2') }}</dd>
      </dl>
    </section>
  </SeoHub>
</template>
