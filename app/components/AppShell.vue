<script setup lang="ts">
import type { MatchDialogState } from '#shared/match/types'

const { t } = useI18n()
const route = useRoute()
const dialog = ref<MatchDialogState>(null)

const pageKind = computed(() =>
  /(?:^|\/)match\//.test(route.path) ? 'match' : 'home',
)

function openSources() {
  dialog.value = { kind: 'sources' }
}

function openPlayer(index: number) {
  dialog.value = { kind: 'player', index }
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#match-search">{{ t('shell.skipToSearch') }}</a>
    <SiteHeader @sources="openSources" />
    <main :class="`page-${pageKind}`">
      <slot :open-player="openPlayer" :open-sources="openSources" />
      <SiteFooter @sources="openSources" />
    </main>
    <MatchDialog v-model="dialog" />
    <MatchItemHoverLayer />
    <MatchHeroHoverLayer />
    <MatchAbilityHoverLayer />
    <AppToast />
  </div>
</template>
