<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const title = computed(() => t('compare.dotabuff.title'))
const description = computed(() => t('compare.dotabuff.description'))
const lead = computed(() => t('compare.dotabuff.lead'))

const related = computed(() => [
  {
    label: t('hubs.linkCompareOpendota'),
    path: localePath({ name: 'compare-opendota' }),
  },
])

const rows = computed(() => [
  {
    topic: t('compare.dotabuff.r1Topic'),
    them: t('compare.dotabuff.r1Them'),
    us: t('compare.dotabuff.r1Us'),
  },
  {
    topic: t('compare.dotabuff.r2Topic'),
    them: t('compare.dotabuff.r2Them'),
    us: t('compare.dotabuff.r2Us'),
  },
  {
    topic: t('compare.dotabuff.r3Topic'),
    them: t('compare.dotabuff.r3Them'),
    us: t('compare.dotabuff.r3Us'),
  },
  {
    topic: t('compare.dotabuff.r4Topic'),
    them: t('compare.dotabuff.r4Them'),
    us: t('compare.dotabuff.r4Us'),
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
      <p>{{ t('compare.dotabuff.whenThem') }}</p>
      <p>{{ t('compare.dotabuff.whenUs') }}</p>
    </section>
    <section class="seo-hub__section">
      <table class="seo-hub__table">
        <caption>
          {{
            t('compare.dotabuff.tableCaption')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('compare.dotabuff.colTopic') }}</th>
            <th scope="col">{{ t('compare.dotabuff.colThem') }}</th>
            <th scope="col">{{ t('compare.dotabuff.colUs') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.topic">
            <th scope="row">{{ row.topic }}</th>
            <td>{{ row.them }}</td>
            <td>{{ row.us }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </SeoHub>
</template>
