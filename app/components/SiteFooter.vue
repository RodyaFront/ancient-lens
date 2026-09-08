<script setup lang="ts">
const emit = defineEmits<{
  sources: []
}>()
</script>

<template>
  <footer>
    <span
      >Ancient Lens <span class="footer-divider">/</span> Незалежний інструмент
      Dota 2</span
    >
    <button
      id="source-footer"
      class="text-button"
      type="button"
      @click="emit('sources')"
    >
      Дані OpenDota <AppIcon name="external-link" />
    </button>
  </footer>
</template>
