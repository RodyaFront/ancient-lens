<script setup lang="ts">
import type { MatchPlayer } from '#shared/match/types'
import {
  initials,
  formatNumber,
  playerDisplayName,
  steamAssetUrl,
  steamHeroRenderUrl,
} from '~/utils/matchFormat'

const props = defineProps<{
  player: MatchPlayer
  team: 'radiant' | 'dire'
}>()

const { t } = useI18n()
const store = useMatchStore()

const displayName = computed(() => playerDisplayName(props.player))
const heroLabel = computed(() => store.heroName(props.player))
const heroEntry = computed(() => store.heroById(props.player.hero_id))
const portraitUrl = computed(() => steamAssetUrl(heroEntry.value?.img))
const renderUrl = computed(() => steamHeroRenderUrl(heroEntry.value?.name))
const fallback = computed(() => initials(heroLabel.value))
const portraitFailed = ref(false)
const renderFailed = ref(false)
const ariaLabel = computed(() =>
  t('score.mvpAria', { player: displayName.value, hero: heroLabel.value }),
)
const kdaAria = computed(() =>
  t('score.mvpKdaAria', {
    kills: formatNumber(props.player.kills),
    deaths: formatNumber(props.player.deaths),
    assists: formatNumber(props.player.assists),
  }),
)

watch(portraitUrl, () => {
  portraitFailed.value = false
})

watch(renderUrl, () => {
  renderFailed.value = false
})

function onPortraitError() {
  portraitFailed.value = true
}

function onRenderError() {
  renderFailed.value = true
}
</script>

<template>
  <aside class="mvp-panel" :class="team" :aria-label="ariaLabel">
    <div class="mvp-poster">
      <img
        v-if="portraitUrl && !portraitFailed"
        class="mvp-art mvp-art-splash"
        :src="portraitUrl"
        :alt="heroLabel"
        loading="lazy"
        @error="onPortraitError"
      />
      <div v-else class="mvp-art mvp-art-fallback" aria-hidden="true">
        {{ fallback }}
      </div>

      <div class="mvp-wash" aria-hidden="true" />

      <img
        v-if="renderUrl && !renderFailed"
        class="mvp-art mvp-art-render"
        :src="renderUrl"
        alt=""
        aria-hidden="true"
        loading="lazy"
        @error="onRenderError"
      />

      <!-- Stage is the art band above the plate — stamp centers here, not full card -->
      <div class="mvp-stage" aria-hidden="true">
        <strong class="mvp-stamp">{{ t('score.mvpStamp') }}</strong>
      </div>

      <div class="mvp-plate">
        <div class="mvp-identity">
          <strong class="mvp-name" :title="displayName">{{
            displayName
          }}</strong>
          <small class="mvp-hero">{{ heroLabel }}</small>
        </div>

        <div class="mvp-stats">
          <p class="mvp-kda" :aria-label="kdaAria">
            <span class="mvp-kda-k">{{ formatNumber(player.kills) }}</span>
            <span class="mvp-kda-sep" aria-hidden="true">/</span>
            <span class="mvp-kda-d">{{ formatNumber(player.deaths) }}</span>
            <span class="mvp-kda-sep" aria-hidden="true">/</span>
            <span class="mvp-kda-a">{{ formatNumber(player.assists) }}</span>
          </p>
          <p class="mvp-nw">
            <span class="mvp-nw-label">{{ t('score.mvpNw') }}</span>
            <span class="mvp-nw-value">{{
              formatNumber(player.net_worth)
            }}</span>
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
