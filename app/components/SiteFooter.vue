<script setup lang="ts">
const emit = defineEmits<{
  sources: []
}>()

const { t } = useI18n()
</script>

<template>
  <footer>
    <span
      >Ancient Lens <span class="footer-divider">/</span>
      {{ t('shell.footerTagline') }}</span
    >
    <button
      id="source-footer"
      class="text-button"
      type="button"
      @click="emit('sources')"
    >
      {{ t('shell.footerSources') }}
    </button>
  </footer>
</template>
