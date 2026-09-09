<script setup lang="ts">
import { isNum, kda, total } from '#shared/match'
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

const views = computed(() => [
  { id: 'overview' as ScoreboardView, label: t('scoreboard.overview') },
  { id: 'economy' as ScoreboardView, label: t('scoreboard.economy') },
  { id: 'combat' as ScoreboardView, label: t('scoreboard.combat') },
])

const filters = computed(() => [
  { id: 'all' as const, label: t('scoreboard.all') },
  { id: 'radiant' as const, label: 'Radiant' },
  { id: 'dire' as const, label: 'Dire' },
])

type HeadCol = { label: string; title?: string }

const heads = computed((): HeadCol[] => {
  if (store.view === 'economy') {
    return [
      { label: 'NET WORTH' },
      { label: 'GPM' },
      { label: 'XPM' },
      { label: 'LH / DN' },
    ]
  }
  if (store.view === 'combat') {
    return [
      {
        label: t('scoreboard.colDamage'),
        title: t('scoreboard.damageTitle'),
      },
      { label: t('scoreboard.colBuildings') },
      { label: t('scoreboard.colHealing') },
      {
        label: t('scoreboard.colParticipation'),
        title: t('scoreboard.participationTitle'),
      },
    ]
  }
  return [
    { label: 'NET WORTH' },
    { label: 'GPM' },
    { label: 'LH / DN' },
    {
      label: t('scoreboard.colDamage'),
      title: t('scoreboard.damageTitle'),
    },
  ]
})

const groups = computed(() => {
  if (!store.match) {
    return []
  }
  const radiantScore = isNum(store.match.radiant_score)
    ? store.match.radiant_score
    : total(store.radiantPlayers, 'kills')
  const direScore = isNum(store.match.dire_score)
    ? store.match.dire_score
    : total(store.direPlayers, 'kills')

  return [
    { players: store.radiantPlayers, radiant: true, kills: radiantScore },
    { players: store.direPlayers, radiant: false, kills: direScore },
  ].filter(
    (group) =>
      store.filter === 'all' || (store.filter === 'radiant') === group.radiant,
  )
})

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

function killParticipation(player: MatchPlayer, teamKills: number | null) {
  if (
    isNum(teamKills) &&
    teamKills > 0 &&
    isNum(player.kills) &&
    isNum(player.assists)
  ) {
    return `${Math.round(((player.kills + player.assists) / teamKills) * 100)}%`
  }
  return t('format.emDash')
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
          :aria-selected="store.view === entry.id"
          :tabindex="store.view === entry.id ? '0' : '-1'"
          aria-controls="score-table"
          :data-tab="entry.id"
          type="button"
          @click="store.view = entry.id"
          @keydown="onTabKey"
        >
          {{ entry.label }}
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
            <th scope="col">{{ t('scoreboard.colHero') }}</th>
            <th scope="col" class="kda-col">{{ t('scoreboard.colKda') }}</th>
            <th
              v-for="head in heads"
              :key="head.label"
              scope="col"
              class="number-col"
              :title="head.title || head.label"
            >
              {{ head.label }}
            </th>
            <th scope="col" class="items-col">
              {{ t('scoreboard.colItems') }}
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
            v-for="player in ordered(group.players)"
            :key="playerIndex(player)"
            class="player-row"
          >
            <td>
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
              <span>{{ formatNumber(player.kills) }}</span>
              <span class="separator">/</span>
              <span class="death">{{ formatNumber(player.deaths) }}</span>
              <span class="separator">/</span>
              <span>{{ formatNumber(player.assists) }}</span>
            </td>
            <template v-if="store.view === 'economy'">
              <td class="gold" :title="formatNumber(player.net_worth)">
                {{ formatShort(player.net_worth) }}
              </td>
              <td>{{ formatNumber(player.gold_per_min) }}</td>
              <td>{{ formatNumber(player.xp_per_min) }}</td>
              <td>
                {{ formatNumber(player.last_hits)
                }}<span class="secondary-number">
                  / {{ formatNumber(player.denies) }}</span
                >
              </td>
            </template>
            <template v-else-if="store.view === 'combat'">
              <td :title="formatNumber(player.hero_damage)">
                {{ formatShort(player.hero_damage) }}
              </td>
              <td :title="formatNumber(player.tower_damage)">
                {{ formatShort(player.tower_damage) }}
              </td>
              <td :title="formatNumber(player.hero_healing)">
                {{ formatShort(player.hero_healing) }}
              </td>
              <td>{{ killParticipation(player, group.kills) }}</td>
            </template>
            <template v-else>
              <td class="gold" :title="formatNumber(player.net_worth)">
                {{ formatShort(player.net_worth) }}
              </td>
              <td>{{ formatNumber(player.gold_per_min) }}</td>
              <td>
                {{ formatNumber(player.last_hits)
                }}<span class="secondary-number">
                  / {{ formatNumber(player.denies) }}</span
                >
              </td>
              <td :title="formatNumber(player.hero_damage)">
                {{ formatShort(player.hero_damage) }}
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
                  <AppIcon name="chevron" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-footnote">
      {{ t('scoreboard.footnote')
      }}<span class="scroll-hint">{{ t('scoreboard.scrollHint') }}</span>
    </div>
  </div>
</template>
