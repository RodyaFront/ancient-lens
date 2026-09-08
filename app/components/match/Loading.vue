<script setup lang="ts">
const store = useMatchStore()
</script>

<template>
  <div class="loading-panel" role="status" aria-live="polite">
    <div class="loading-title">
      <span class="spinner" aria-hidden="true" />
      <div>
        <strong>Завантаження матчу</strong>
        <p>Очікуємо відповідь OpenDota…</p>
      </div>
      <button
        id="cancel-load"
        class="ghost"
        type="button"
        @click="store.cancelLoad()"
      >
        Скасувати
      </button>
    </div>
    <div class="skeleton summary-skeleton" aria-hidden="true" />
    <div class="skeleton line" aria-hidden="true" />
    <div class="skeleton line" aria-hidden="true" />
    <div class="skeleton line" aria-hidden="true" />
  </div>
</template>
