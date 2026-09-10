<script setup lang="ts">
const emit = defineEmits<{
  sources: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const links = computed(() => [
  {
    to: localePath({ name: 'guides-how-to-read-a-dota-2-match' }),
    label: t('nav.guides'),
  },
  { to: localePath({ name: 'heroes' }), label: t('nav.heroes') },
  { to: localePath({ name: 'matches' }), label: t('nav.matches') },
  { to: localePath({ name: 'about' }), label: t('nav.about') },
])
</script>

<template>
  <footer>
    <div class="footer-brand">
      <span
        >Ancient Lens <span class="footer-divider">/</span>
        {{ t('shell.footerTagline') }}</span
      >
      <nav class="footer-nav" :aria-label="t('shell.footerNav')">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{
          link.label
        }}</NuxtLink>
      </nav>
    </div>
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
