<script setup lang="ts">
import { duration, isNum, pickMatchMvp, total } from '#shared/match'
import type { MatchPlayer } from '#shared/match/types'
import {
  formatDate,
  formatNumber,
  gameModeLabel,
  lobbyLabel,
  lobbyTone,
  regionLabel,
} from '~/utils/matchFormat'

const { t } = useI18n()
const store = useMatchStore()
const audio = useScoreAudio()
const card = ref<HTMLElement | null>(null)
const vfx = ref<{ play: () => Promise<void> | void } | null>(null)
const mvpOpen = ref(false)
let revealGeneration = 0
let mvpOpenTimer: ReturnType<typeof setTimeout> | null = null

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
const mvp = computed(() => {
  if (!match.value) {
    return null
  }
  return pickMatchMvp(match.value, [
    ...store.radiantPlayers,
    ...store.direPlayers,
  ])
})
const mvpTeam = computed(() => (mvp.value ? winner.value : null))

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

function clearMvpOpenTimer() {
  if (mvpOpenTimer != null) {
    clearTimeout(mvpOpenTimer)
    mvpOpenTimer = null
  }
}

function openMvpPanel() {
  clearMvpOpenTimer()
  if (mvp.value) {
    mvpOpen.value = true
  }
}

function scheduleMvpOpen(immediate: boolean) {
  clearMvpOpenTimer()
  if (!mvp.value) {
    mvpOpen.value = false
    return
  }
  if (immediate) {
    mvpOpen.value = true
    return
  }
  const generation = revealGeneration
  mvpOpenTimer = setTimeout(() => {
    if (generation === revealGeneration) {
      mvpOpen.value = true
    }
  }, 2500)
}

function startReveal(withSound = false) {
  revealGeneration += 1
  mvpOpen.value = false
  clearMvpOpenTimer()

  const el = card.value
  if (!el || !winner.value) {
    scheduleMvpOpen(true)
    return
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (withSound) {
      store.showToast(t('toast.motionReduced'))
    }
    scheduleMvpOpen(true)
    return
  }
  const generation = revealGeneration
  el.classList.remove('score-reveal')
  void el.offsetWidth
  el.classList.add('score-reveal')
  void vfx.value?.play()
  if (withSound) {
    audio.play(winner.value)
  }
  scheduleMvpOpen(false)
  window.setTimeout(() => {
    if (generation === revealGeneration) {
      el.classList.remove('score-reveal')
    }
  }, 3600)
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
    openMvpPanel()
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

onBeforeUnmount(() => {
  clearMvpOpenTimer()
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
        <span
          class="tiny-tag"
          :data-tone="lobbyTone(match.lobby_type) ?? undefined"
        >
          {{ lobbyLabel(match.lobby_type) }}
        </span>
      </div>
      <div class="match-actions">
        <button
          class="icon-button"
          :class="{ 'is-saved': store.isSaved }"
          type="button"
          :title="store.isSaved ? t('score.unsave') : t('score.save')"
          :aria-label="store.isSaved ? t('score.unsave') : t('score.save')"
          :aria-pressed="store.isSaved"
          @click="store.toggleSaved()"
        >
          <Icon name="lucide:bookmark" aria-hidden="true" />
        </button>
        <button
          class="icon-button"
          type="button"
          :title="t('score.refresh')"
          :aria-label="t('score.refresh')"
          @click="store.loadMatch(String(match.match_id), { sound: true })"
        >
          <Icon name="lucide:refresh-cw" aria-hidden="true" />
        </button>
        <button
          class="ghost"
          type="button"
          :title="t('score.export')"
          :aria-label="t('score.exportAria')"
          @click="store.exportMatch()"
        >
          <Icon name="lucide:download" aria-hidden="true" />
          <span class="export-label">JSON</span>
        </button>
      </div>
    </div>

    <div class="score-row" :class="{ 'is-mvp-open': mvpOpen && !!mvp }">
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
      <MatchMvpPanel v-if="mvp && mvpTeam" :player="mvp" :team="mvpTeam" />
    </div>
    <slot />
  </section>
</template>
