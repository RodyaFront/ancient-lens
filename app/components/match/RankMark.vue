<script setup lang="ts">
import { parseRankTier, rankTierIconSrc } from '#shared/match'

const props = withDefaults(
  defineProps<{
    rankTier?: unknown
    sampleSize?: unknown
    /** Show “Avg” prefix (publicMatches batch average). */
    average?: boolean
    /** Compact inline mark, or feature medal for list signal columns. */
    size?: 'sm' | 'feature'
  }>(),
  {
    average: true,
    size: 'sm',
  },
)

const { t } = useI18n()

const parts = computed(() => parseRankTier(props.rankTier))
const iconSrc = computed(() => rankTierIconSrc(props.rankTier))
const isFeature = computed(() => props.size === 'feature')
const iconPx = computed(() => (isFeature.value ? 64 : 24))

const medalLabel = computed(() => {
  const p = parts.value
  if (!p) {
    return ''
  }
  return t(`format.rankMedal.${p.medal}`)
})

const starCount = computed(() => {
  const p = parts.value
  if (!p || p.medal === 'immortal' || p.stars < 1) {
    return 0
  }
  return p.stars
})

const starsLabel = computed(() => {
  if (starCount.value < 1) {
    return ''
  }
  return `${starCount.value}★`
})

const starsGlyphs = computed(() => {
  if (starCount.value < 1) {
    return ''
  }
  return '★'.repeat(starCount.value)
})

const sampleN = computed(() => {
  const n = props.sampleSize
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.floor(n)
})

const titleText = computed(() => {
  const p = parts.value
  if (!p) {
    return ''
  }
  const medal = t(`format.rankMedal.${p.medal}`)
  const core =
    p.medal === 'immortal' || p.stars < 1
      ? medal
      : t('format.rankTierStars', { medal, stars: p.stars })
  const n = sampleN.value
  if (props.average && n != null) {
    return t('matchesPage.rankAvgSample', { rank: core, n })
  }
  if (props.average) {
    return t('matchesPage.rankAvg', { rank: core })
  }
  return core
})
</script>

<template>
  <span
    v-if="parts && iconSrc"
    class="rank-mark"
    :class="{ 'rank-mark--feature': isFeature }"
    :title="titleText"
  >
    <span v-if="isFeature" class="rank-mark__emblem">
      <img
        class="rank-mark__icon"
        :src="iconSrc"
        alt=""
        :width="iconPx"
        :height="iconPx"
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      <span v-if="starsGlyphs" class="rank-mark__stars" aria-hidden="true">{{
        starsGlyphs
      }}</span>
    </span>
    <img
      v-else
      class="rank-mark__icon"
      :src="iconSrc"
      alt=""
      :width="iconPx"
      :height="iconPx"
      loading="lazy"
      decoding="async"
      aria-hidden="true"
    />
    <span class="rank-mark__body">
      <span class="rank-mark__line">
        <span v-if="average" class="rank-mark__avg">{{
          t('matchesPage.rankAvgShort')
        }}</span>
        <span class="rank-mark__identity">
          <span class="rank-mark__medal">{{ medalLabel }}</span>
          <span v-if="!isFeature && starsLabel" class="rank-mark__stars">{{
            starsLabel
          }}</span>
        </span>
      </span>
      <slot name="below" />
    </span>
  </span>
</template>
