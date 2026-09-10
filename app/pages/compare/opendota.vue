<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const title = computed(() => t('compare.opendota.title'))
const description = computed(() => t('compare.opendota.description'))
const lead = computed(() => t('compare.opendota.lead'))

const related = computed(() => [
  {
    label: t('hubs.linkCompareDotabuff'),
    path: localePath({ name: 'compare-dotabuff' }),
  },
])

const rows = computed(() => [
  {
    topic: t('compare.opendota.r1Topic'),
    them: t('compare.opendota.r1Them'),
    us: t('compare.opendota.r1Us'),
  },
  {
    topic: t('compare.opendota.r2Topic'),
    them: t('compare.opendota.r2Them'),
    us: t('compare.opendota.r2Us'),
  },
  {
    topic: t('compare.opendota.r3Topic'),
    them: t('compare.opendota.r3Them'),
    us: t('compare.opendota.r3Us'),
  },
  {
    topic: t('compare.opendota.r4Topic'),
    them: t('compare.opendota.r4Them'),
    us: t('compare.opendota.r4Us'),
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
      <p>{{ t('compare.opendota.whenThem') }}</p>
      <p>{{ t('compare.opendota.whenUs') }}</p>
    </section>
    <section class="seo-hub__section">
      <table class="seo-hub__table">
        <caption>
          {{
            t('compare.opendota.tableCaption')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('compare.opendota.colTopic') }}</th>
            <th scope="col">{{ t('compare.opendota.colThem') }}</th>
            <th scope="col">{{ t('compare.opendota.colUs') }}</th>
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
