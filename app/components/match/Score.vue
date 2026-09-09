<script setup lang="ts">
import { duration, isNum, total } from '#shared/match'
import type { MatchPlayer } from '#shared/match/types'
import {
  formatDate,
  formatNumber,
  gameModeLabel,
  lobbyLabel,
  regionLabel,
} from '~/utils/matchFormat'

const { t, locale } = useI18n()
const store = useMatchStore()
const audio = useScoreAudio()
const card = ref<HTMLElement | null>(null)
const vfx = ref<{ play: () => Promise<void> | void } | null>(null)

const dateLocale = computed(() => (locale.value === 'uk' ? 'uk-UA' : 'en-US'))

function formatFetchedAt(when: string | number) {
  return new Date(when).toLocaleString(dateLocale.value)
}

const match = computed(() => store.match)
const winner = computed(() => {
  if (match.value?.radiant_win === true) {
    return 'radiant'
  }
  if (match.value?.radiant_win === false) {
    return 'dire'
  }
  return null
})
const radiantScore = computed(() => {
  if (!match.value) {
    return null
  }
  return isNum(match.value.radiant_score)
    ? match.value.radiant_score
    : total(store.radiantPlayers, 'kills')
})
const direScore = computed(() => {
  if (!match.value) {
    return null
  }
  return isNum(match.value.dire_score)
    ? match.value.dire_score
    : total(store.direPlayers, 'kills')
})

function sortedDraft(players: MatchPlayer[]) {
  return [...players].sort(
    (left, right) => (left.player_slot ?? 0) - (right.player_slot ?? 0),
  )
}

function teamName(isRadiant: boolean) {
  const label = isRadiant ? 'Radiant' : 'Dire'
  const team = isRadiant ? match.value?.radiant_team : match.value?.dire_team
  return team?.name || label
}

function startReveal(withSound = false) {
  const el = card.value
  if (!el || !winner.value) {
    return
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (withSound) {
      store.showToast(t('toast.motionReduced'))
    }
    return
  }
  el.classList.remove('score-reveal')
  void el.offsetWidth
  el.classList.add('score-reveal')
  void vfx.value?.play()
  if (withSound) {
    audio.play(winner.value)
  }
}

function replay() {
  audio.unlock()
  window.setTimeout(() => startReveal(true), 20)
}

function onAnimationEnd(event: AnimationEvent) {
  const el = card.value
  if (
    el &&
    event.target instanceof HTMLElement &&
    event.target.matches('.score-meta') &&
    event.animationName === 'score-meta-in'
  ) {
    el.classList.remove('score-reveal')
  }
}

watch(
  () => store.revealNonce,
  async () => {
    await nextTick()
    startReveal(store.revealWithSound)
  },
)

onMounted(() => {
  if (store.revealNonce > 0) {
    startReveal(store.revealWithSound)
  }
})
</script>

<template>
  <section
    v-if="match && store.source"
    class="match-section"
    :aria-label="t('score.regionAria')"
  >
    <div class="match-topline">
      <div class="match-caption">
        <h2>{{ t('score.matchLabel', { id: match.match_id }) }}</h2>
        <span class="tiny-tag">{{ lobbyLabel(match.lobby_type) }}</span>
        <span
          class="source-status"
          :title="
            t('score.fetchedAt', {
              when: formatFetchedAt(store.source.fetchedAt),
            })
          "
        >
          OpenDota ·
          {{
            store.source.kind === 'live'
              ? t('score.sourceLive')
              : t('score.sourceSnapshot')
          }}
        </span>
      </div>
      <div class="match-actions">
        <button
          class="ghost replay-score"
          type="button"
          :title="winner ? t('score.replayTitle') : t('score.replayDisabled')"
          :aria-label="t('score.replayAria')"
          :disabled="!winner"
          @click="replay"
        >
          <AppIcon name="sparkles" />
          <span class="replay-label">{{ t('score.replayShort') }}</span>
        </button>
        <button
          class="icon-button"
          :class="{ 'is-saved': store.isSaved }"
          type="button"
          :title="store.isSaved ? t('score.unsave') : t('score.save')"
          :aria-label="store.isSaved ? t('score.unsave') : t('score.save')"
          :aria-pressed="store.isSaved"
          @click="store.toggleSaved()"
        >
          <AppIcon name="bookmark" />
        </button>
        <button
          class="icon-button"
          type="button"
          :title="t('score.refresh')"
          :aria-label="t('score.refresh')"
          @click="store.loadMatch(String(match.match_id), { sound: true })"
        >
          <AppIcon name="refresh" />
        </button>
        <button
          class="ghost"
          type="button"
          :title="t('score.export')"
          :aria-label="t('score.exportAria')"
          @click="store.exportMatch()"
        >
          <AppIcon name="download" />
          <span class="export-label">JSON</span>
        </button>
      </div>
    </div>

    <div
      ref="card"
      class="score-card"
      :class="{ 'dire-win': winner === 'dire' }"
      :data-winner="winner || ''"
      @animationend="onAnimationEnd"
    >
      <MatchScoreEmbers :winner="winner" />
      <div class="score-fx" aria-hidden="true">
        <MatchScoreVfx ref="vfx" :winner="winner" />
        <div v-if="winner" class="fx-verdict">
          <span>{{ t('score.verdictBanner') }}</span>
          <strong>{{ winner.toUpperCase() }}</strong>
        </div>
      </div>
      <div class="score-main">
        <div class="team-intro radiant">
          <span class="team-side">{{ t('score.radiantSide') }}</span>
          <h3>{{ teamName(true) }}</h3>
          <small class="team-result" :class="{ won: winner === 'radiant' }">
            {{
              winner
                ? winner === 'radiant'
                  ? t('score.win')
                  : t('score.loss')
                : t('score.resultUnknown')
            }}
          </small>
          <div class="team-draft" :aria-label="t('score.radiantHeroes')">
            <MatchHeroPortrait
              v-for="(player, index) in sortedDraft(store.radiantPlayers)"
              :key="`r-${index}`"
              :player="player"
            />
          </div>
        </div>
        <div class="score-center">
          <span class="score-label">{{ t('score.scoreLabel') }}</span>
          <div
            class="scoreline"
            :aria-label="`Radiant ${formatNumber(radiantScore)}, Dire ${formatNumber(direScore)}`"
          >
            <span
              class="r"
              :class="{ 'winner-score': match.radiant_win === true }"
            >
              {{ formatNumber(radiantScore) }}
            </span>
            <span class="colon">:</span>
            <span
              class="d"
              :class="{ 'winner-score': match.radiant_win === false }"
            >
              {{ formatNumber(direScore) }}
            </span>
          </div>
          <div class="duration">
            {{ t('score.duration') }}
            <strong>{{ duration(match.duration) }}</strong>
          </div>
        </div>
        <div class="team-intro dire">
          <span class="team-side">{{ t('score.direSide') }}</span>
          <h3>{{ teamName(false) }}</h3>
          <small class="team-result" :class="{ won: winner === 'dire' }">
            {{
              winner
                ? winner === 'dire'
                  ? t('score.win')
                  : t('score.loss')
                : t('score.resultUnknown')
            }}
          </small>
          <div class="team-draft" :aria-label="t('score.direHeroes')">
            <MatchHeroPortrait
              v-for="(player, index) in sortedDraft(store.direPlayers)"
              :key="`d-${index}`"
              :player="player"
            />
          </div>
        </div>
      </div>
      <div class="score-meta">
        <span>
          <span class="meta-label">{{ t('score.metaMode') }}</span
          >{{ gameModeLabel(match.game_mode) }}
        </span>
        <span>
          <span class="meta-label">{{ t('score.metaStart') }}</span
          >{{ formatDate(match.start_time) }}
        </span>
        <span>
          <span class="meta-label">{{ t('score.metaRegion') }}</span
          >{{ regionLabel(match.region) }}
        </span>
        <span>
          <span class="meta-label">{{ t('score.metaStats') }}</span>
          {{
            isNum(match.version)
              ? t('score.statsDetailed')
              : t('score.statsBasic')
          }}
        </span>
      </div>
    </div>
    <slot />
  </section>
</template>
