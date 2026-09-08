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

const store = useMatchStore()
const audio = useScoreAudio()
const card = ref<HTMLElement | null>(null)

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
const particles = Array.from({ length: 18 }, (_, index) => ({
  i: index,
  x: `${(index * 37) % 100}%`,
  y: `${18 + ((index * 29) % 66)}%`,
  dx: `${-85 + ((index * 47) % 170)}px`,
  dy: `${-70 + ((index * 31) % 140)}px`,
}))

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
      store.showToast('Анімацію вимкнено системними налаштуваннями.')
    }
    return
  }
  el.classList.remove('score-reveal')
  void el.offsetWidth
  el.classList.add('score-reveal')
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
    aria-label="Огляд матчу"
  >
    <div class="match-topline">
      <div class="match-caption">
        <h2>Матч #{{ match.match_id }}</h2>
        <span class="tiny-tag">{{ lobbyLabel(match.lobby_type) }}</span>
        <span
          class="source-status"
          :title="`Отримано ${new Date(store.source.fetchedAt).toLocaleString('uk-UA')}`"
        >
          OpenDota ·
          {{ store.source.kind === 'live' ? 'отримано з API' : 'знімок' }}
        </span>
      </div>
      <div class="match-actions">
        <button
          class="ghost replay-score"
          type="button"
          :title="
            winner
              ? 'Повторити появу рахунку зі звуком'
              : 'Результат матчу не надано'
          "
          aria-label="Повторити анімацію рахунку зі звуком"
          :disabled="!winner"
          @click="replay"
        >
          <AppIcon name="sparkles" />
          <span class="replay-label">Повтор</span>
        </button>
        <button
          class="icon-button"
          :class="{ 'is-saved': store.isSaved }"
          type="button"
          :title="store.isSaved ? 'Видалити зі збережених' : 'Зберегти матч'"
          :aria-label="
            store.isSaved ? 'Видалити зі збережених' : 'Зберегти матч'
          "
          :aria-pressed="store.isSaved"
          @click="store.toggleSaved()"
        >
          <AppIcon name="bookmark" />
        </button>
        <button
          class="icon-button"
          type="button"
          title="Оновити з OpenDota"
          aria-label="Оновити з OpenDota"
          @click="store.loadMatch(String(match.match_id), { sound: true })"
        >
          <AppIcon name="refresh" />
        </button>
        <button
          class="ghost"
          type="button"
          title="Експортувати JSON"
          aria-label="Експортувати матч у JSON"
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
      <div class="score-fx" aria-hidden="true">
        <div class="fx-field fx-radiant" />
        <div class="fx-field fx-dire" />
        <div class="fx-scan" />
        <div class="fx-impact" />
        <div class="fx-particles">
          <i
            v-for="particle in particles"
            :key="particle.i"
            :style="{
              '--i': particle.i,
              '--x': particle.x,
              '--y': particle.y,
              '--dx': particle.dx,
              '--dy': particle.dy,
            }"
          />
        </div>
        <div v-if="winner" class="fx-verdict">
          <span>ПЕРЕМОЖЕЦЬ МАТЧУ</span>
          <strong>{{ winner.toUpperCase() }}</strong>
        </div>
      </div>
      <div class="score-main">
        <div class="team-intro radiant">
          <span class="team-side">СИЛИ СВІТЛА</span>
          <h3>{{ teamName(true) }}</h3>
          <small class="team-result" :class="{ won: winner === 'radiant' }">
            {{
              winner
                ? winner === 'radiant'
                  ? 'Перемога'
                  : 'Поразка'
                : 'Результат не надано'
            }}
          </small>
          <div class="team-draft" aria-label="Герої Radiant">
            <MatchHeroPortrait
              v-for="(player, index) in sortedDraft(store.radiantPlayers)"
              :key="`r-${index}`"
              :player="player"
            />
          </div>
        </div>
        <div class="score-center">
          <span class="score-label">РАХУНОК</span>
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
            Тривалість <strong>{{ duration(match.duration) }}</strong>
          </div>
        </div>
        <div class="team-intro dire">
          <span class="team-side">СИЛИ ТЕМРЯВИ</span>
          <h3>{{ teamName(false) }}</h3>
          <small class="team-result" :class="{ won: winner === 'dire' }">
            {{
              winner
                ? winner === 'dire'
                  ? 'Перемога'
                  : 'Поразка'
                : 'Результат не надано'
            }}
          </small>
          <div class="team-draft" aria-label="Герої Dire">
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
          <span class="meta-label">Режим</span
          >{{ gameModeLabel(match.game_mode) }}
        </span>
        <span>
          <span class="meta-label">Початок</span
          >{{ formatDate(match.start_time) }}
        </span>
        <span>
          <span class="meta-label">Регіон</span>{{ regionLabel(match.region) }}
        </span>
        <span>
          <span class="meta-label">Статистика</span>
          {{ isNum(match.version) ? 'Детальна' : 'Базова' }}
        </span>
      </div>
    </div>
    <slot />
  </section>
</template>
