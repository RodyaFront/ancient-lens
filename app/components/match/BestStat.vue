<script setup lang="ts">
const props = defineProps<{
  /** When true, wraps the value with best-in-match tooltip + star. */
  best?: boolean
}>()

const { t } = useI18n()

const label = computed(() => t('scoreboard.bestInMatch'))
</script>

<template>
  <span class="metric-cell" :class="{ 'metric-cell--best': props.best }">
    <AppTooltip v-if="props.best" :text="label" :label="label">
      <span class="metric-value">
        <slot />
      </span>
      <span class="best-stat" aria-hidden="true">
        <svg class="best-stat-icon" viewBox="0 0 24 24" focusable="false">
          <path
            fill="currentColor"
            d="M12 2.8 14.6 9l6.7.6-5.1 4.4 1.5 6.5L12 17.2 6.3 20.5l1.5-6.5L2.7 9.6 9.4 9 12 2.8Z"
          />
        </svg>
      </span>
    </AppTooltip>
    <span v-else class="metric-value">
      <slot />
    </span>
  </span>
</template>
