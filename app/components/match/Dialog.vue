<script setup lang="ts">
import { duration, radiant } from '#shared/match'
import { OPENDOTA_API } from '#shared/match/constants'
import type { MatchDialogState, MatchPlayer } from '#shared/match/types'
import {
  flagLabel,
  formatKda,
  formatNumber,
  playerDisplayName,
  playerItemId,
} from '~/utils/matchFormat'

const dialog = defineModel<MatchDialogState>({ required: true })

const store = useMatchStore()
const root = ref<HTMLDialogElement | null>(null)

const title = computed(() => {
  if (dialog.value?.kind === 'sources') {
    return 'Дані та їхня точність'
  }
  if (dialog.value?.kind === 'saved') {
    return 'Збережені матчі'
  }
  if (dialog.value?.kind === 'player') {
    return player.value ? playerDisplayName(player.value) : ''
  }
  if (dialog.value?.kind === 'item') {
    return (
      store.itemById(dialog.value.id)?.dname || `Предмет #${dialog.value.id}`
    )
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
    ['Вбивства', current.kills],
    ['Смерті', current.deaths],
    ['Асисти', current.assists],
    ['Net worth', current.net_worth],
    ['GPM', current.gold_per_min],
    ['XPM', current.xp_per_min],
    ['Шкода героям', current.hero_damage],
    ['Шкода будівлям', current.tower_damage],
    ['Лікування героїв', current.hero_healing],
    ['Добиті кріпи', current.last_hits],
    ['Заперечені кріпи', current.denies],
    ['Встановлені Observer', current.obs_placed],
    ['Встановлені Sentry', current.sen_placed],
    ['Викупи', current.buyback_count],
    ['Рівень', current.level],
  ] as const
})

watch(dialog, async (state) => {
  await nextTick()
  const el = root.value
  if (!el) {
    return
  }
  if (state && !el.open) {
    el.showModal()
  }
  if (!state && el.open) {
    el.close()
  }
})

function close() {
  dialog.value = null
}

function openItem(id: number) {
  dialog.value = { kind: 'item', id }
}

function onDialogClose() {
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

function savedResult(entry: { radiant_win?: boolean }) {
  if (entry.radiant_win === true) {
    return 'Перемога Radiant'
  }
  if (entry.radiant_win === false) {
    return 'Перемога Dire'
  }
  return 'Результат не надано'
}

function openSaved(id: string) {
  close()
  void store.loadMatch(id, { sound: true })
}

function removeSaved(id: string) {
  store.removeSaved(id)
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
    <div class="dialog-head">
      <h2 id="dialog-title">{{ title }}</h2>
      <button
        id="close-dialog"
        class="icon-button"
        type="button"
        aria-label="Закрити"
        @click="close"
      >
        <AppIcon name="x" />
      </button>
    </div>
    <div id="dialog-content">
      <template v-if="dialog?.kind === 'sources'">
        <p>
          Статистика матчів надходить із
          <a
            href="https://docs.opendota.com/"
            target="_blank"
            rel="noopener noreferrer"
            >OpenDota API</a
          >. З URL Dotabuff інструмент читає тільки ID матчу. Статистика
          завантажується з OpenDota.
        </p>
        <p>
          Доступність і повнота даних залежать від OpenDota та публічності
          матчу. Імена прихованих гравців можуть бути відсутні. Символ «—»
          означає, що джерело не надало значення. Нуль означає реальний нуль.
        </p>
        <p>
          «Знімок» — збережена відповідь API з указаним часом отримання.
          «Отримано з API» — відповідь на поточний запит. Дані не оновлюються
          безперервно. Збережені матчі — це лише закладки в цьому браузері.
        </p>
        <p>
          Net worth — вартість героя наприкінці матчу. KDA = (вбивства + асисти)
          / max(1, смерті). GPM / XPM — золото / досвід за хвилину; LH / DN —
          добиті / заперечені кріпи. Участь у вбивствах = (K + A) / командні
          вбивства.
        </p>
        <p>
          Довідники героїв і предметів: OpenDota. Зображення: CDN Valve. Назви
          та зображення можуть відображати новішу версію гри; історичні
          показники предметів тут не реконструюються. Це незалежний інструмент.
        </p>
        <p v-if="store.source">
          <strong>Поточний матч:</strong> {{ store.source.label }}. Отримано
          {{ new Date(store.source.fetchedAt).toLocaleString('uk-UA') }}.
        </p>
        <div class="dialog-source-links">
          <a
            href="https://docs.opendota.com/"
            target="_blank"
            rel="noopener noreferrer"
            >Документація ↗</a
          >
          <a
            v-if="store.match"
            :href="`${OPENDOTA_API}/matches/${store.match.match_id}`"
            target="_blank"
            rel="noopener noreferrer"
            >Відповідь API ↗</a
          >
        </div>
      </template>

      <template v-else-if="dialog?.kind === 'saved'">
        <template v-if="store.saved.length">
          <p>
            Закладки доступні в цьому браузері. Натисніть матч, щоб отримати
            актуальні дані.
          </p>
          <div v-for="entry in store.saved" :key="entry.id" class="saved-row">
            <button
              class="saved-open"
              type="button"
              @click="openSaved(entry.id)"
            >
              <strong>#{{ entry.id }}</strong>
              <small>
                {{ savedResult(entry) }} · {{ duration(entry.duration) }}
              </small>
            </button>
            <button
              class="icon-button"
              type="button"
              :aria-label="`Видалити матч ${entry.id}`"
              @click="removeSaved(entry.id)"
            >
              <AppIcon name="trash" />
            </button>
          </div>
        </template>
        <p v-else>
          Поки що немає збережених матчів. Відкрийте матч і натисніть значок
          закладки поруч із його номером.
        </p>
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
        <div class="detail-heading">Основний інвентар</div>
        <div class="detail-items">
          <MatchItemSlot
            v-for="slot in 6"
            :key="slot"
            :item-id="playerItemId(player, `item_${slot - 1}`)"
            @open="openItem"
          />
        </div>
        <div class="detail-heading">Рюкзак</div>
        <div class="detail-items">
          <MatchItemSlot
            v-for="slot in 3"
            :key="slot"
            :item-id="playerItemId(player, `backpack_${slot - 1}`)"
            @open="openItem"
          />
        </div>
        <div class="detail-heading">Нейтральні слоти</div>
        <div class="detail-items">
          <MatchItemSlot :item-id="player.item_neutral" @open="openItem" />
          <MatchItemSlot :item-id="player.item_neutral2" @open="openItem" />
        </div>
        <p>
          Aghanim’s Scepter: {{ flagLabel(player.aghanims_scepter) }} · Shard:
          {{ flagLabel(player.aghanims_shard) }}
        </p>
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
            >Профіль в OpenDota ↗</a
          >
        </p>
        <p v-else>Публічний ID гравця не надано джерелом.</p>
      </template>

      <template v-else-if="dialog?.kind === 'item'">
        <div class="detail-items">
          <MatchItemSlot :item-id="dialog.id" />
        </div>
        <p>
          ID предмета: <strong>{{ dialog.id }}</strong>
        </p>
        <p>
          Предмет у фінальному інвентарі. Назва та іконка — з довідника
          OpenDota.
        </p>
        <p>
          Клацніть ім’я гравця в таблиці, щоб переглянути основні слоти, рюкзак
          та нейтральні предмети.
        </p>
      </template>
    </div>
  </dialog>
</template>
