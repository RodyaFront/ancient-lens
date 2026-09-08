<script setup lang="ts">
import { isNum, total } from '#shared/match'
import type { MatchPlayer } from '#shared/match/types'
import {
  formatKda,
  formatNumber,
  formatShort,
  playerDisplayName,
} from '~/utils/matchFormat'

const emit = defineEmits<{
  player: [index: number]
}>()

const store = useMatchStore()

const radiantNet = computed(() => total(store.radiantPlayers, 'net_worth'))
const direNet = computed(() => total(store.direPlayers, 'net_worth'))
const radiantDamage = computed(() => total(store.radiantPlayers, 'hero_damage'))
const direDamage = computed(() => total(store.direPlayers, 'hero_damage'))

const topKiller = computed(() => {
  const ranked = [...(store.match?.players ?? [])]
    .filter((player) => isNum(player.kills))
    .sort((left, right) => (right.kills as number) - (left.kills as number))
  return ranked[0] ?? null
})

const sharedLead = computed(() => {
  const top = topKiller.value
  if (!top || !store.match) {
    return false
  }
  return (
    store.match.players.filter((player) => player.kills === top.kills).length >
    1
  )
})

function playerIndex(player: MatchPlayer) {
  return store.match?.players.indexOf(player) ?? -1
}

function fraction(left: number | null, right: number | null) {
  if (!isNum(left) || !isNum(right) || left + right <= 0) {
    return 50
  }
  return (left / (left + right)) * 100
}

function netCaption(left: number | null, right: number | null) {
  if (!isNum(left) || !isNum(right)) {
    return 'Джерело не надало повних даних для порівняння.'
  }
  if (left === right) {
    return 'Однакова сумарна цінність команд.'
  }
  return `${left > right ? 'Radiant' : 'Dire'}: перевага ${formatNumber(Math.abs(left - right))} золота.`
}

function damageCaption(left: number | null, right: number | null) {
  if (!isNum(left) || !isNum(right)) {
    return 'Джерело не надало повних даних для порівняння.'
  }
  return `Разом ${formatNumber(left + right)} шкоди від доступних гравців.`
}
</script>

<template>
  <section
    v-if="store.match"
    class="summary-section"
    aria-label="Командна статистика"
  >
    <div class="section-heading">
      <h2>Командні підсумки</h2>
      <span>На кінець матчу</span>
    </div>
    <div class="insight-grid">
      <article class="insight-card">
        <div class="insight-label">Сумарний net worth</div>
        <div class="insight-values">
          <div>
            <small>Radiant</small>
            <strong class="radiant-value" :title="formatNumber(radiantNet)">
              {{ formatShort(radiantNet) }}
            </strong>
          </div>
          <div>
            <small>Dire</small>
            <strong class="dire-value" :title="formatNumber(direNet)">
              {{ formatShort(direNet) }}
            </strong>
          </div>
        </div>
        <div
          v-if="isNum(radiantNet) && isNum(direNet)"
          class="comparison-bar"
          :aria-label="`Radiant ${formatNumber(radiantNet)}, Dire ${formatNumber(direNet)}`"
        >
          <span
            class="radiant-fill"
            :style="{ width: `${fraction(radiantNet, direNet)}%` }"
          />
          <span
            class="dire-fill"
            :style="{ width: `${100 - fraction(radiantNet, direNet)}%` }"
          />
        </div>
        <p class="insight-caption">{{ netCaption(radiantNet, direNet) }}</p>
      </article>
      <article class="insight-card">
        <div class="insight-label">Шкода героям</div>
        <div class="insight-values">
          <div>
            <small>Radiant</small>
            <strong class="radiant-value" :title="formatNumber(radiantDamage)">
              {{ formatShort(radiantDamage) }}
            </strong>
          </div>
          <div>
            <small>Dire</small>
            <strong class="dire-value" :title="formatNumber(direDamage)">
              {{ formatShort(direDamage) }}
            </strong>
          </div>
        </div>
        <div
          v-if="isNum(radiantDamage) && isNum(direDamage)"
          class="comparison-bar"
          :aria-label="`Radiant ${formatNumber(radiantDamage)}, Dire ${formatNumber(direDamage)}`"
        >
          <span
            class="radiant-fill"
            :style="{
              width: `${fraction(radiantDamage, direDamage)}%`,
            }"
          />
          <span
            class="dire-fill"
            :style="{
              width: `${100 - fraction(radiantDamage, direDamage)}%`,
            }"
          />
        </div>
        <p class="insight-caption">
          {{ damageCaption(radiantDamage, direDamage) }}
        </p>
      </article>
      <article class="insight-card">
        <div class="insight-label">Найбільше вбивств</div>
        <div v-if="topKiller" class="insight-player">
          <MatchHeroPortrait :player="topKiller" />
          <div>
            <button
              class="player-name"
              type="button"
              :title="playerDisplayName(topKiller)"
              @click="emit('player', playerIndex(topKiller))"
            >
              {{ playerDisplayName(topKiller) }}
            </button>
            <small>{{ store.heroName(topKiller) }}</small>
          </div>
          <strong class="highlight-value">
            {{ formatNumber(topKiller.kills) }}
            <small>вбивств</small>
          </strong>
        </div>
        <p v-if="topKiller" class="insight-caption">
          {{ formatNumber(topKiller.kills) }} /
          {{ formatNumber(topKiller.deaths) }} /
          {{ formatNumber(topKiller.assists) }} ·
          {{ formatKda(topKiller) }} KDA{{
            sharedLead ? ' · спільне лідерство' : ''
          }}
        </p>
        <p v-else class="metric-unavailable">Даних недостатньо</p>
      </article>
    </div>
  </section>
</template>
