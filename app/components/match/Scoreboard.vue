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
}>()

const { t } = useI18n()
const store = useMatchStore()

const scoreboardEnter = ref(false)
const tableClipOverflow = ref(false)
let enterClipTimer: ReturnType<typeof setTimeout> | null = null

const ENTER_CLIP_MS = 700

watch(
  () => store.revealNonce,
  async (nonce) => {
    if (!nonce) {
      return
    }
    if (
      import.meta.client &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      scoreboardEnter.value = false
      tableClipOverflow.value = false
      return
    }
    if (enterClipTimer) {
      clearTimeout(enterClipTimer)
      enterClipTimer = null
    }
    scoreboardEnter.value = false
    tableClipOverflow.value = false
    await nextTick()
    scoreboardEnter.value = true
    tableClipOverflow.value = true
    enterClipTimer = setTimeout(() => {
      tableClipOverflow.value = false
      enterClipTimer = null
    }, ENTER_CLIP_MS)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (enterClipTimer) {
    clearTimeout(enterClipTimer)
  }
})

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
    tone: 'overview' as const,
  },
  {
    id: 'economy' as ScoreboardView,
    label: t('scoreboard.economy'),
    icon: 'lucide:coins',
    tone: 'economy' as const,
  },
  {
    id: 'combat' as ScoreboardView,
    label: t('scoreboard.combat'),
    icon: 'lucide:swords',
    tone: 'combat' as const,
  },
])

const filters = computed(() => [
  { id: 'all' as const, label: t('scoreboard.all') },
  { id: 'radiant' as const, label: 'Radiant' },
  { id: 'dire' as const, label: 'Dire' },
])

type MetricColId =
  | 'net_worth'
  | 'gpm'
  | 'xpm'
  | 'lh_dn'
  | 'damage'
  | 'buildings'
  | 'healing'
  | 'participation'

type HeadCol = {
  id: MetricColId
  label: string
  tip: string
  tone: 'overview' | 'economy' | 'combat'
}

const SET_COLUMNS: Record<ScoreboardView, MetricColId[]> = {
  overview: ['net_worth', 'gpm', 'lh_dn', 'damage'],
  economy: ['net_worth', 'gpm', 'xpm', 'lh_dn'],
  combat: ['damage', 'buildings', 'healing', 'participation'],
}

const COLUMN_ORDER: MetricColId[] = [
  'net_worth',
  'gpm',
  'xpm',
  'lh_dn',
  'damage',
  'buildings',
  'healing',
  'participation',
]

function columnMeta(id: MetricColId): Omit<HeadCol, 'tone'> {
  switch (id) {
    case 'net_worth':
      return {
        id,
        label: t('scoreboard.colNetWorth'),
        tip: t('scoreboard.tipNetWorth'),
      }
    case 'gpm':
      return {
        id,
        label: t('scoreboard.colGpm'),
        tip: t('scoreboard.tipGpm'),
      }
    case 'xpm':
      return {
        id,
        label: t('scoreboard.colXpm'),
        tip: t('scoreboard.tipXpm'),
      }
    case 'lh_dn':
      return {
        id,
        label: t('scoreboard.colLhDn'),
        tip: t('scoreboard.tipLhDn'),
      }
    case 'damage':
      return {
        id,
        label: t('scoreboard.colDamage'),
        tip: t('scoreboard.tipDamage'),
      }
    case 'buildings':
      return {
        id,
        label: t('scoreboard.colBuildings'),
        tip: t('scoreboard.tipBuildings'),
      }
    case 'healing':
      return {
        id,
        label: t('scoreboard.colHealing'),
        tip: t('scoreboard.tipHealing'),
      }
    case 'participation':
      return {
        id,
        label: t('scoreboard.colParticipation'),
        tip: t('scoreboard.tipParticipation'),
      }
  }
}

/** Header tone from the last enabled set that owns the column. */
function columnTone(
  id: MetricColId,
  sets: Record<ScoreboardView, boolean>,
): HeadCol['tone'] {
  let tone: HeadCol['tone'] = 'overview'
  for (const viewId of ['overview', 'economy', 'combat'] as ScoreboardView[]) {
    if (sets[viewId] && SET_COLUMNS[viewId].includes(id)) {
      tone = viewId
    }
  }
  return tone
}

const heads = computed((): HeadCol[] => {
  const sets = store.columnSets
  const enabled = new Set<MetricColId>()
  for (const viewId of ['overview', 'economy', 'combat'] as ScoreboardView[]) {
    if (!sets[viewId]) {
      continue
    }
    for (const col of SET_COLUMNS[viewId]) {
      enabled.add(col)
    }
  }
  return COLUMN_ORDER.filter((id) => enabled.has(id)).map((id) => ({
    ...columnMeta(id),
    tone: columnTone(id, sets),
  }))
})

const tableColspan = computed(() => 3 + heads.value.length)

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

function setEnabled(id: ScoreboardView) {
  return store.columnSets[id]
}

function toneIcon(tone: HeadCol['tone']) {
  if (tone === 'economy') {
    return 'lucide:coins'
  }
  if (tone === 'combat') {
    return 'lucide:swords'
  }
  return 'lucide:layout-list'
}

function onSetKey(event: KeyboardEvent, id: ScoreboardView) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return
  }
  event.preventDefault()
  const ids = views.value.map((entry) => entry.id)
  let index = ids.indexOf(id)
  if (event.key === 'Home') {
    index = 0
  } else if (event.key === 'End') {
    index = ids.length - 1
  } else {
    index =
      (index + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length
  }
  const nextId = ids[index]
  if (!nextId) {
    return
  }
  nextTick(() => {
    document.querySelector<HTMLInputElement>(`[data-tab="${nextId}"]`)?.focus()
  })
}
</script>

<template>
  <div v-if="store.match" class="panel">
    <div class="scoreboard-controls">
      <div class="tabs" role="group" :aria-label="t('scoreboard.tabsAria')">
        <label
          v-for="entry in views"
          :key="entry.id"
          class="tab"
          :class="{ active: setEnabled(entry.id) }"
          :data-tone="entry.tone"
        >
          <input
            class="tab-check"
            type="checkbox"
            :checked="setEnabled(entry.id)"
            :data-tab="entry.id"
            :aria-label="entry.label"
            @change="store.toggleColumnSet(entry.id)"
            @keydown="onSetKey($event, entry.id)"
          />
          <Icon :name="entry.icon" class="tab-icon" aria-hidden="true" />
          <span>{{ entry.label }}</span>
        </label>
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
      :class="{ 'is-entering': tableClipOverflow }"
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
              :key="head.id"
              scope="col"
              class="number-col"
              :data-tone="head.tone"
            >
              <AppTooltip :text="head.tip" :label="head.tip">
                <span class="head-label">
                  <Icon
                    :name="toneIcon(head.tone)"
                    class="head-icon"
                    aria-hidden="true"
                  />
                  {{ head.label }}
                </span>
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
            <td :colspan="tableColspan">
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
            <template
              v-for="head in heads"
              :key="`${playerIndex(player)}-${head.id}`"
            >
              <td
                v-if="head.id === 'net_worth'"
                class="gold"
                :title="formatNumber(player.net_worth)"
              >
                <MatchBestStat :best="isBest(player, 'net_worth')">
                  {{ formatShort(player.net_worth) }}
                </MatchBestStat>
              </td>
              <td v-else-if="head.id === 'gpm'">
                <MatchBestStat :best="isBest(player, 'gold_per_min')">
                  {{ formatNumber(player.gold_per_min) }}
                </MatchBestStat>
              </td>
              <td v-else-if="head.id === 'xpm'">
                <MatchBestStat :best="isBest(player, 'xp_per_min')">
                  {{ formatNumber(player.xp_per_min) }}
                </MatchBestStat>
              </td>
              <td v-else-if="head.id === 'lh_dn'">
                <MatchBestStat :best="isBest(player, 'last_hits')">
                  {{ formatNumber(player.last_hits) }}
                </MatchBestStat>
                <span class="secondary-number"> / </span>
                <MatchBestStat :best="isBest(player, 'denies')">
                  {{ formatNumber(player.denies) }}
                </MatchBestStat>
              </td>
              <td
                v-else-if="head.id === 'damage'"
                :title="formatNumber(player.hero_damage)"
              >
                <MatchBestStat :best="isBest(player, 'hero_damage')">
                  {{ formatShort(player.hero_damage) }}
                </MatchBestStat>
              </td>
              <td
                v-else-if="head.id === 'buildings'"
                :title="formatNumber(player.tower_damage)"
              >
                <MatchBestStat :best="isBest(player, 'tower_damage')">
                  {{ formatShort(player.tower_damage) }}
                </MatchBestStat>
              </td>
              <td
                v-else-if="head.id === 'healing'"
                :title="formatNumber(player.hero_healing)"
              >
                <MatchBestStat :best="isBest(player, 'hero_healing')">
                  {{ formatShort(player.hero_healing) }}
                </MatchBestStat>
              </td>
              <td v-else-if="head.id === 'participation'">
                <MatchBestStat :best="isBestParticipation(player, group.kills)">
                  {{ killParticipation(player, group.kills) }}
                </MatchBestStat>
              </td>
            </template>
            <td>
              <div class="item-set">
                <MatchItemSlot
                  v-for="slot in 6"
                  :key="slot"
                  :item-id="playerItemId(player, `item_${slot - 1}`)"
                />
                <MatchItemSlot :item-id="player.item_neutral" extra="neutral" />
                <MatchItemSlot
                  :item-id="player.item_neutral2"
                  extra="neutral enchant"
                />
                <MatchAghanimPair
                  :scepter-owned="player.aghanims_scepter === 1"
                  :shard-owned="player.aghanims_shard === 1"
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
