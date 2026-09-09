<script setup lang="ts">
import {
  buildPartyMarks,
  isMatchBestStat,
  isNum,
  kda,
  killParticipationPercent,
  matchParticipationExtreme,
  matchStatExtreme,
  radiant,
  total,
} from '#shared/match'
import type { BestStatKey, PartyMark } from '#shared/match'
import type { MatchPlayer, ScoreboardView } from '#shared/match/types'
import {
  formatNumber,
  formatShort,
  playerDisplayName,
  playerItemId,
} from '~/utils/matchFormat'

const emit = defineEmits<{
  player: [index: number]
  item: [id: number]
}>()

const { t } = useI18n()
const store = useMatchStore()

const scoreboardPending = ref(true)
const scoreboardEnter = ref(false)

watch(
  () => store.revealDoneNonce,
  async (nonce) => {
    if (!nonce) {
      return
    }
    if (
      import.meta.client &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      scoreboardPending.value = false
      scoreboardEnter.value = false
      return
    }
    if (scoreboardPending.value) {
      scoreboardPending.value = false
      await nextTick()
      scoreboardEnter.value = true
      return
    }
    scoreboardEnter.value = false
    await nextTick()
    scoreboardEnter.value = true
  },
)

function rowEnterDelay(player: MatchPlayer) {
  if (!scoreboardEnter.value) {
    return undefined
  }
  let index = 0
  for (const group of groups.value) {
    for (const entry of ordered(group.players)) {
      if (entry === player) {
        return `${Math.min(index, 12) * 30}ms`
      }
      index += 1
    }
  }
  return '0ms'
}

const views = computed(() => [
  {
    id: 'overview' as ScoreboardView,
    label: t('scoreboard.overview'),
    icon: 'lucide:layout-list',
    tone: 'overview',
  },
  {
    id: 'economy' as ScoreboardView,
    label: t('scoreboard.economy'),
    icon: 'lucide:coins',
    tone: 'economy',
  },
  {
    id: 'combat' as ScoreboardView,
    label: t('scoreboard.combat'),
    icon: 'lucide:swords',
    tone: 'combat',
  },
])

const filters = computed(() => [
  { id: 'all' as const, label: t('scoreboard.all') },
  { id: 'radiant' as const, label: 'Radiant' },
  { id: 'dire' as const, label: 'Dire' },
])

type HeadCol = { label: string; tip: string }

const heads = computed((): HeadCol[] => {
  if (store.view === 'economy') {
    return [
      {
        label: t('scoreboard.colNetWorth'),
        tip: t('scoreboard.tipNetWorth'),
      },
      { label: t('scoreboard.colGpm'), tip: t('scoreboard.tipGpm') },
      { label: t('scoreboard.colXpm'), tip: t('scoreboard.tipXpm') },
      { label: t('scoreboard.colLhDn'), tip: t('scoreboard.tipLhDn') },
    ]
  }
  if (store.view === 'combat') {
    return [
      {
        label: t('scoreboard.colDamage'),
        tip: t('scoreboard.tipDamage'),
      },
      {
        label: t('scoreboard.colBuildings'),
        tip: t('scoreboard.tipBuildings'),
      },
      {
        label: t('scoreboard.colHealing'),
        tip: t('scoreboard.tipHealing'),
      },
      {
        label: t('scoreboard.colParticipation'),
        tip: t('scoreboard.tipParticipation'),
      },
    ]
  }
  return [
    {
      label: t('scoreboard.colNetWorth'),
      tip: t('scoreboard.tipNetWorth'),
    },
    { label: t('scoreboard.colGpm'), tip: t('scoreboard.tipGpm') },
    { label: t('scoreboard.colLhDn'), tip: t('scoreboard.tipLhDn') },
    {
      label: t('scoreboard.colDamage'),
      tip: t('scoreboard.tipDamage'),
    },
  ]
})

const teamKillTotals = computed(() => {
  if (!store.match) {
    return { radiant: null as number | null, dire: null as number | null }
  }
  return {
    radiant: isNum(store.match.radiant_score)
      ? store.match.radiant_score
      : total(store.radiantPlayers, 'kills'),
    dire: isNum(store.match.dire_score)
      ? store.match.dire_score
      : total(store.direPlayers, 'kills'),
  }
})

/** Match-wide extremes; ties share the badge on every equal leader. */
const extremes = computed(() => {
  const players = store.match?.players ?? []
  const keys: BestStatKey[] = [
    'kills',
    'deaths',
    'assists',
    'net_worth',
    'gold_per_min',
    'xp_per_min',
    'last_hits',
    'denies',
    'hero_damage',
    'tower_damage',
    'hero_healing',
  ]
  const byKey = Object.fromEntries(
    keys.map((key) => [key, matchStatExtreme(players, key)]),
  ) as Record<BestStatKey, number | null>

  return {
    ...byKey,
    participation: matchParticipationExtreme(players, (player) =>
      radiant(player)
        ? teamKillTotals.value.radiant
        : teamKillTotals.value.dire,
    ),
  }
})

const groups = computed(() => {
  if (!store.match) {
    return []
  }

  return [
    {
      players: store.radiantPlayers,
      radiant: true,
      kills: teamKillTotals.value.radiant,
    },
    {
      players: store.direPlayers,
      radiant: false,
      kills: teamKillTotals.value.dire,
    },
  ].filter(
    (group) =>
      store.filter === 'all' || (store.filter === 'radiant') === group.radiant,
  )
})

const partyMarks = computed(() => buildPartyMarks(store.match?.players ?? []))

function ordered(players: MatchPlayer[]) {
  return [...players].sort((left, right) => {
    if (store.sort === 'slot') {
      return (left.player_slot ?? 0) - (right.player_slot ?? 0)
    }
    if (store.sort === 'kda') {
      return (kda(right) ?? -1) - (kda(left) ?? -1)
    }
    return (
      ((right[store.sort] as number | undefined) ?? -1) -
      ((left[store.sort] as number | undefined) ?? -1)
    )
  })
}

function playerIndex(player: MatchPlayer) {
  return store.match?.players.indexOf(player) ?? -1
}

function partyMark(player: MatchPlayer): PartyMark | null {
  const index = playerIndex(player)
  if (index < 0) {
    return null
  }
  return partyMarks.value[index] ?? null
}

function orderedRows(players: MatchPlayer[]) {
  return ordered(players).map((player) => ({
    player,
    party: partyMark(player),
  }))
}

function isBest(player: MatchPlayer, key: BestStatKey) {
  return isMatchBestStat(
    player[key],
    extremes.value[key],
    key === 'deaths' ? 'min' : 'max',
  )
}

function isBestParticipation(player: MatchPlayer, teamKills: number | null) {
  return isMatchBestStat(
    killParticipationPercent(player, teamKills),
    extremes.value.participation,
    'max',
  )
}

function killParticipation(player: MatchPlayer, teamKills: number | null) {
  const percent = killParticipationPercent(player, teamKills)
  if (percent === null) {
    return t('format.emDash')
  }
  return `${percent}%`
}

function onTabKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return
  }
  event.preventDefault()
  const ids = views.value.map((entry) => entry.id)
  let index = ids.indexOf(store.view)
  if (event.key === 'Home') {
    index = 0
  } else if (event.key === 'End') {
    index = 2
  } else {
    index = (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
  }
  const nextView = ids[index]
  if (nextView) {
    store.view = nextView
  }
  nextTick(() => {
    document
      .querySelector<HTMLButtonElement>(`[data-tab="${store.view}"]`)
      ?.focus()
  })
}
</script>

<template>
  <div v-if="store.match" class="panel">
    <div class="scoreboard-controls">
      <div class="tabs" role="tablist" :aria-label="t('scoreboard.tabsAria')">
        <button
          v-for="entry in views"
          :id="`tab-${entry.id}`"
          :key="entry.id"
          role="tab"
          class="tab"
          :class="{ active: store.view === entry.id }"
          :data-tone="entry.tone"
          :aria-selected="store.view === entry.id"
          :tabindex="store.view === entry.id ? '0' : '-1'"
          aria-controls="score-table"
          :data-tab="entry.id"
          type="button"
          @click="store.view = entry.id"
          @keydown="onTabKey"
        >
          <Icon :name="entry.icon" class="tab-icon" aria-hidden="true" />
          <span>{{ entry.label }}</span>
        </button>
      </div>
      <div class="control-right">
        <div
          class="filter"
          role="group"
          :aria-label="t('scoreboard.filterAria')"
        >
          <button
            v-for="entry in filters"
            :key="entry.id"
            type="button"
            :class="{ active: store.filter === entry.id }"
            :aria-pressed="store.filter === entry.id"
            :data-filter="entry.id"
            @click="store.filter = entry.id"
          >
            {{ entry.label }}
          </button>
        </div>
        <label class="sr-only" for="sort">{{
          t('scoreboard.sortLabel')
        }}</label>
        <select id="sort" v-model="store.sort" class="sort-select">
          <option value="slot">{{ t('scoreboard.sortSlot') }}</option>
          <option value="kills">{{ t('scoreboard.sortKills') }}</option>
          <option value="net_worth">{{ t('scoreboard.sortNetWorth') }}</option>
          <option value="hero_damage">{{ t('scoreboard.sortDamage') }}</option>
          <option value="kda">{{ t('scoreboard.sortKda') }}</option>
        </select>
      </div>
    </div>
    <div
      id="score-table"
      class="table-scroll"
      role="tabpanel"
      :aria-labelledby="`tab-${store.view}`"
      tabindex="0"
    >
      <table :aria-label="t('scoreboard.tableAria')">
        <thead>
          <tr>
            <th scope="col">
              <AppTooltip
                :text="t('scoreboard.tipHero')"
                :label="t('scoreboard.tipHero')"
              >
                {{ t('scoreboard.colHero') }}
              </AppTooltip>
            </th>
            <th scope="col" class="kda-col">
              <AppTooltip
                :text="t('scoreboard.tipKda')"
                :label="t('scoreboard.tipKda')"
              >
                {{ t('scoreboard.colKda') }}
              </AppTooltip>
            </th>
            <th
              v-for="head in heads"
              :key="head.label"
              scope="col"
              class="number-col"
            >
              <AppTooltip :text="head.tip" :label="head.tip">
                {{ head.label }}
              </AppTooltip>
            </th>
            <th scope="col" class="items-col">
              <AppTooltip
                :text="t('scoreboard.tipItems')"
                :label="t('scoreboard.tipItems')"
              >
                {{ t('scoreboard.colItems') }}
              </AppTooltip>
            </th>
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="String(group.radiant)">
          <tr class="team-row" :class="{ dire: !group.radiant }">
            <td colspan="7">
              <div class="team-row-inner">
                {{ group.radiant ? 'RADIANT' : 'DIRE' }}
                <span
                  v-if="
                    typeof store.match.radiant_win === 'boolean' &&
                    store.match.radiant_win === group.radiant
                  "
                  class="winner-label"
                >
                  {{ t('score.win') }}
                </span>
                <span class="team-kills">
                  {{
                    t('scoreboard.playersKills', {
                      count: group.players.length,
                      kills: formatNumber(group.kills),
                    })
                  }}
                </span>
              </div>
            </td>
          </tr>
          <tr
            v-for="{ player, party } in orderedRows(group.players)"
            :key="playerIndex(player)"
            class="player-row"
            :class="{
              'has-party': !!party,
              'scoreboard-pending': scoreboardPending,
              'scoreboard-enter': scoreboardEnter,
            }"
            :style="
              scoreboardEnter
                ? { '--row-delay': rowEnterDelay(player) }
                : undefined
            "
          >
            <td>
              <div
                v-if="party"
                class="party-mark"
                :data-party="Math.min(party.ordinal, 5)"
                :title="t('scoreboard.partyTip', { count: party.size })"
                :aria-label="t('scoreboard.partyTip', { count: party.size })"
              >
                <span class="party-strip" aria-hidden="true" />
              </div>
              <div class="hero-cell">
                <MatchHeroPortrait :player="player" />
                <div class="hero-info">
                  <button
                    class="player-name"
                    type="button"
                    :title="
                      t('scoreboard.openStats', {
                        name: playerDisplayName(player),
                      })
                    "
                    @click="emit('player', playerIndex(player))"
                  >
                    {{ playerDisplayName(player) }}
                  </button>
                  <span class="hero-name">{{ store.heroName(player) }}</span>
                </div>
              </div>
            </td>
            <td class="kda">
              <MatchBestStat :best="isBest(player, 'kills')">
                {{ formatNumber(player.kills) }}
              </MatchBestStat>
              <span class="separator">/</span>
              <MatchBestStat :best="isBest(player, 'deaths')">
                <span class="death">{{ formatNumber(player.deaths) }}</span>
              </MatchBestStat>
              <span class="separator">/</span>
              <MatchBestStat :best="isBest(player, 'assists')">
                {{ formatNumber(player.assists) }}
              </MatchBestStat>
            </td>
            <template v-if="store.view === 'economy'">
              <td class="gold" :title="formatNumber(player.net_worth)">
                <MatchBestStat :best="isBest(player, 'net_worth')">
                  {{ formatShort(player.net_worth) }}
                </MatchBestStat>
              </td>
              <td>
                <MatchBestStat :best="isBest(player, 'gold_per_min')">
                  {{ formatNumber(player.gold_per_min) }}
                </MatchBestStat>
              </td>
              <td>
                <MatchBestStat :best="isBest(player, 'xp_per_min')">
                  {{ formatNumber(player.xp_per_min) }}
                </MatchBestStat>
              </td>
              <td>
                <MatchBestStat :best="isBest(player, 'last_hits')">
                  {{ formatNumber(player.last_hits) }}
                </MatchBestStat>
                <span class="secondary-number"> / </span>
                <MatchBestStat :best="isBest(player, 'denies')">
                  {{ formatNumber(player.denies) }}
                </MatchBestStat>
              </td>
            </template>
            <template v-else-if="store.view === 'combat'">
              <td :title="formatNumber(player.hero_damage)">
                <MatchBestStat :best="isBest(player, 'hero_damage')">
                  {{ formatShort(player.hero_damage) }}
                </MatchBestStat>
              </td>
              <td :title="formatNumber(player.tower_damage)">
                <MatchBestStat :best="isBest(player, 'tower_damage')">
                  {{ formatShort(player.tower_damage) }}
                </MatchBestStat>
              </td>
              <td :title="formatNumber(player.hero_healing)">
                <MatchBestStat :best="isBest(player, 'hero_healing')">
                  {{ formatShort(player.hero_healing) }}
                </MatchBestStat>
              </td>
              <td>
                <MatchBestStat :best="isBestParticipation(player, group.kills)">
                  {{ killParticipation(player, group.kills) }}
                </MatchBestStat>
              </td>
            </template>
            <template v-else>
              <td class="gold" :title="formatNumber(player.net_worth)">
                <MatchBestStat :best="isBest(player, 'net_worth')">
                  {{ formatShort(player.net_worth) }}
                </MatchBestStat>
              </td>
              <td>
                <MatchBestStat :best="isBest(player, 'gold_per_min')">
                  {{ formatNumber(player.gold_per_min) }}
                </MatchBestStat>
              </td>
              <td>
                <MatchBestStat :best="isBest(player, 'last_hits')">
                  {{ formatNumber(player.last_hits) }}
                </MatchBestStat>
                <span class="secondary-number"> / </span>
                <MatchBestStat :best="isBest(player, 'denies')">
                  {{ formatNumber(player.denies) }}
                </MatchBestStat>
              </td>
              <td :title="formatNumber(player.hero_damage)">
                <MatchBestStat :best="isBest(player, 'hero_damage')">
                  {{ formatShort(player.hero_damage) }}
                </MatchBestStat>
              </td>
            </template>
            <td>
              <div class="item-set">
                <MatchItemSlot
                  v-for="slot in 6"
                  :key="slot"
                  :item-id="playerItemId(player, `item_${slot - 1}`)"
                  @open="emit('item', $event)"
                />
                <MatchItemSlot
                  :item-id="player.item_neutral"
                  extra="neutral"
                  @open="emit('item', $event)"
                />
                <button
                  class="item more"
                  type="button"
                  :aria-label="
                    t('scoreboard.details', {
                      name: playerDisplayName(player),
                    })
                  "
                  @click="emit('player', playerIndex(player))"
                >
                  <Icon name="lucide:chevron-right" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-footnote">
      <span class="scroll-hint">{{ t('scoreboard.scrollHint') }}</span>
    </div>
  </div>
</template>
