<script setup lang="ts">
import type { MatchDialogState } from '#shared/match/types'

const { t } = useI18n()
const dialog = ref<MatchDialogState>(null)

function openSources() {
  dialog.value = { kind: 'sources' }
}

function openSaved() {
  dialog.value = { kind: 'saved' }
}

function openPlayer(index: number) {
  dialog.value = { kind: 'player', index }
}

function openItem(id: number) {
  dialog.value = { kind: 'item', id }
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#match-search">{{ t('shell.skipToSearch') }}</a>
    <SiteHeader @saved="openSaved" @sources="openSources" />
    <main>
      <slot
        :open-player="openPlayer"
        :open-item="openItem"
        :open-sources="openSources"
      />
      <SiteFooter @sources="openSources" />
    </main>
    <MatchDialog v-model="dialog" />
    <AppToast />
  </div>
</template>
