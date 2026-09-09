<script setup lang="ts">
import type { MatchLoadPhase } from '#shared/match'

const { t } = useI18n()
const store = useMatchStore()

const stageCopy = computed(() => {
  const phase: MatchLoadPhase = store.loadPhase
  if (phase === 'resolve') {
    return {
      title: t('loading.stageResolveTitle'),
      body: t('loading.stageResolveBody'),
    }
  }
  if (phase === 'build') {
    return {
      title: t('loading.stageBuildTitle'),
      body: t('loading.stageBuildBody'),
    }
  }
  return {
    title: t('loading.stageFetchTitle'),
    body: t('loading.stageFetchBody'),
  }
})
</script>

<template>
  <div class="loading-panel" role="status" aria-live="polite" aria-busy="true">
    <div class="loading-title">
      <span class="spinner" aria-hidden="true" />
      <div>
        <strong>{{ stageCopy.title }}</strong>
        <p>{{ stageCopy.body }}</p>
      </div>
      <button
        id="cancel-load"
        class="ghost"
        type="button"
        @click="store.cancelLoad()"
      >
        {{ t('loading.cancel') }}
      </button>
    </div>

    <div class="loading-scorebook" aria-hidden="true">
      <div class="loading-score-card skeleton-shimmer">
        <div class="loading-score-main">
          <div class="loading-team-block" />
          <div class="loading-score-center">
            <div class="loading-score-pill tall" />
            <div class="loading-score-pill short" />
          </div>
          <div class="loading-team-block" />
        </div>
        <div class="loading-score-meta">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div class="loading-controls skeleton-shimmer">
        <span class="loading-chip" />
        <span class="loading-chip" />
        <span class="loading-chip wide" />
      </div>
      <div class="loading-rows">
        <div v-for="row in 10" :key="row" class="loading-row skeleton-shimmer">
          <span class="loading-hero" />
          <span class="loading-bar" />
          <span class="loading-bar mid" />
          <span class="loading-bar short" />
        </div>
      </div>
    </div>
  </div>
</template>
