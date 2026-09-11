<script setup lang="ts">
import SiteNavNode from '~/components/SiteNavNode.vue'

const emit = defineEmits<{
  sources: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { tree } = useSiteNav({
  onSources: () => emit('sources'),
})

const homePath = computed(() => localePath({ name: 'index' }))
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink
        class="brand ui-press"
        :to="homePath"
        :aria-label="t('nav.homeAria')"
      >
        ANCIENT <span>LENS</span>
      </NuxtLink>
      <p class="brand-context">
        <span class="brand-context-game">Dota 2</span>
        <span class="brand-context-role">{{ t('nav.role') }}</span>
      </p>
      <nav class="site-nav" :aria-label="t('nav.label')">
        <SiteNavNode v-for="node in tree" :key="node.id" :node="node" />
      </nav>
    </div>
  </header>
</template>
