<script setup lang="ts">
const { t } = useI18n()
const store = useMatchStore()
</script>

<template>
  <div class="loading-panel" role="status" aria-live="polite">
    <div class="loading-title">
      <span class="spinner" aria-hidden="true" />
      <div>
        <strong>{{ t('loading.title') }}</strong>
        <p>{{ t('loading.body') }}</p>
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
    <div class="skeleton summary-skeleton" aria-hidden="true" />
    <div class="skeleton line" aria-hidden="true" />
    <div class="skeleton line" aria-hidden="true" />
    <div class="skeleton line" aria-hidden="true" />
  </div>
</template>
