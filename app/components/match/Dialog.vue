<script setup lang="ts">
import { radiant } from '#shared/match'
import { OPENDOTA_API } from '#shared/match/constants'
import type { MatchDialogState, MatchPlayer } from '#shared/match/types'
import {
  formatKda,
  formatNumber,
  playerDisplayName,
  playerItemId,
} from '~/utils/matchFormat'

const dialog = defineModel<MatchDialogState>({ required: true })

const { t, locale } = useI18n()
const store = useMatchStore()
const root = ref<HTMLDialogElement | null>(null)
const dialogOpen = useMatchDialogOpen()
const itemPreview = useItemPreview()
const heroPreview = useHeroPreview()
const abilityPreview = useAbilityPreview()

const dateLocale = computed(() => (locale.value === 'uk' ? 'uk-UA' : 'en-US'))

const title = computed(() => {
  if (dialog.value?.kind === 'sources') {
    return t('dialog.sourcesTitle')
  }
  if (dialog.value?.kind === 'player') {
    return player.value ? playerDisplayName(player.value) : ''
  }
  return ''
})

const player = computed<MatchPlayer | null>(() => {
  if (dialog.value?.kind !== 'player' || !store.match) {
    return null
  }
  return store.match.players[dialog.value.index] ?? null
})

const playerStats = computed(() => {
  const current = player.value
  if (!current) {
    return []
  }
  return [
    [t('dialog.statKills'), current.kills],
    [t('dialog.statDeaths'), current.deaths],
    [t('dialog.statAssists'), current.assists],
    ['Net worth', current.net_worth],
    ['GPM', current.gold_per_min],
    ['XPM', current.xp_per_min],
    [t('dialog.statHeroDamage'), current.hero_damage],
    [t('dialog.statTowerDamage'), current.tower_damage],
    [t('dialog.statHealing'), current.hero_healing],
    [t('dialog.statLastHits'), current.last_hits],
    [t('dialog.statDenies'), current.denies],
    [t('dialog.statObs'), current.obs_placed],
    [t('dialog.statSen'), current.sen_placed],
    [t('dialog.statBuyback'), current.buyback_count],
    [t('dialog.statLevel'), current.level],
  ] as const
})

watch(dialog, async (state) => {
  await nextTick()
  const el = root.value
  if (!el) {
    return
  }
  if (state && !el.open) {
    dialogOpen.value = true
    el.showModal()
  }
  if (!state && el.open) {
    el.close()
  }
})

function close() {
  dialog.value = null
}

function onDialogClose() {
  dialogOpen.value = false
  itemPreview.dismiss()
  heroPreview.dismiss()
  abilityPreview.dismiss()
  dialog.value = null
}

function onBackdropClick(event: MouseEvent) {
  const el = root.value
  if (!el || event.target !== el) {
    return
  }
  const box = el.getBoundingClientRect()
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  ) {
    el.close()
  }
}
</script>

<template>
  <dialog
    id="info-dialog"
    ref="root"
    aria-labelledby="dialog-title"
    @close="onDialogClose"
    @click="onBackdropClick"
  >
    <div class="dialog-frame">
      <div class="dialog-head">
        <h2 id="dialog-title">{{ title }}</h2>
        <button
          id="close-dialog"
          class="icon-button"
          type="button"
          :aria-label="t('dialog.close')"
          @click="close"
        >
          <Icon name="lucide:x" aria-hidden="true" />
        </button>
      </div>
      <div id="dialog-content">
        <template v-if="dialog?.kind === 'sources'">
          <i18n-t keypath="dialog.sourcesP1" tag="p" scope="global">
            <template #api>
              <a
                href="https://docs.opendota.com/"
                target="_blank"
                rel="noopener noreferrer"
                >OpenDota API</a
              >
            </template>
          </i18n-t>
          <p>{{ t('dialog.sourcesP2') }}</p>
          <p>{{ t('dialog.sourcesP3') }}</p>
          <p>{{ t('dialog.sourcesP4') }}</p>
          <p>{{ t('dialog.sourcesP5') }}</p>
          <p v-if="store.source">
            <strong>{{ t('dialog.currentMatch') }}</strong>
            {{ store.source.label }}.
            {{
              t('dialog.fetchedAt', {
                when: new Date(store.source.fetchedAt).toLocaleString(
                  dateLocale,
                ),
              })
            }}
          </p>
          <div class="dialog-source-links">
            <a
              href="https://docs.opendota.com/"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t('dialog.docsLink') }}</a
            >
            <a
              v-if="store.match"
              :href="`${OPENDOTA_API}/matches/${store.match.match_id}`"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t('dialog.apiResponseLink') }}</a
            >
          </div>
        </template>

        <template v-else-if="dialog?.kind === 'player' && player">
          <div class="hero-cell">
            <MatchHeroPortrait :player="player" />
            <div>
              <strong>{{ store.heroName(player) }}</strong>
              <p>
                {{ radiant(player) ? 'Radiant' : 'Dire' }} · KDA
                {{ formatKda(player) }}
              </p>
            </div>
          </div>
          <div class="detail-stats">
            <div
              v-for="[label, value] in playerStats"
              :key="label"
              class="detail-stat"
            >
              <small>{{ label }}</small>
              <strong>{{ formatNumber(value) }}</strong>
            </div>
          </div>
          <div class="detail-heading">{{ t('dialog.inventoryMain') }}</div>
          <div class="detail-items">
            <MatchItemSlot
              v-for="slot in 6"
              :key="slot"
              :item-id="playerItemId(player, `item_${slot - 1}`)"
            />
          </div>
          <div class="detail-heading">{{ t('dialog.inventoryBackpack') }}</div>
          <div class="detail-items">
            <MatchItemSlot
              v-for="slot in 3"
              :key="slot"
              :item-id="playerItemId(player, `backpack_${slot - 1}`)"
            />
          </div>
          <div class="detail-heading">{{ t('dialog.inventoryNeutral') }}</div>
          <div class="detail-items">
            <MatchItemSlot :item-id="player.item_neutral" extra="neutral" />
            <MatchItemSlot
              :item-id="player.item_neutral2"
              extra="neutral enchant"
            />
          </div>
          <div class="detail-heading">{{ t('dialog.inventoryAghanims') }}</div>
          <div class="detail-items detail-items--aghanims">
            <MatchAghanimPair
              :scepter-owned="player.aghanims_scepter === 1"
              :shard-owned="player.aghanims_shard === 1"
            />
          </div>
          <p
            v-if="
              Number.isSafeInteger(player.account_id) &&
              (player.account_id as number) > 0
            "
          >
            <a
              :href="`https://www.opendota.com/players/${player.account_id}`"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t('dialog.opendotaProfile') }}</a
            >
          </p>
          <p v-else>{{ t('dialog.noPublicId') }}</p>
        </template>
      </div>
    </div>
  </dialog>
</template>
