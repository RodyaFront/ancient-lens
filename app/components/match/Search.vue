<script setup lang="ts">
import { EXAMPLE_MATCH_ID } from '#shared/match/constants'

const store = useMatchStore()
const input = ref(store.lastInput)

watch(
  () => store.lastInput,
  (value) => {
    input.value = value
  },
)

function submit() {
  void store.loadMatch(input.value, { sound: true })
}
</script>

<template>
  <section
    id="match-search"
    class="search-section"
    aria-labelledby="search-title"
  >
    <div class="search-heading">
      <h1 id="search-title">Розбір матчу</h1>
      <p>Результат, економіка, внесок гравців.</p>
    </div>
    <div class="search-controls">
      <form novalidate @submit.prevent="submit">
        <label for="match-input">ID або посилання на матч</label>
        <div class="search-box">
          <input
            id="match-input"
            v-model="input"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="ID або URL матчу"
            aria-describedby="input-help"
            :aria-invalid="store.inputInvalid ? 'true' : undefined"
            :disabled="store.loading"
          />
          <button class="primary" type="submit" :disabled="store.loading">
            Відкрити матч
          </button>
        </div>
      </form>
      <div class="input-footer">
        <span id="input-help">Dotabuff / OpenDota</span>
        <button
          class="text-button"
          type="button"
          :disabled="store.loading"
          @click="store.loadExample({ sound: true })"
        >
          Приклад #{{ EXAMPLE_MATCH_ID }}
        </button>
      </div>
    </div>
    <div v-if="store.error" class="error-box" role="alert">
      <strong>{{ store.error.title }}</strong>
      <p>{{ store.error.body }}</p>
      <div v-if="store.error.actions" class="error-actions">
        <button
          type="button"
          @click="store.loadMatch(store.error.id || input, { sound: true })"
        >
          Спробувати ще раз
        </button>
        <button
          v-if="store.error.id === EXAMPLE_MATCH_ID"
          type="button"
          @click="store.loadExample({ sound: true })"
        >
          Показати перевірений знімок
        </button>
        <a
          v-if="store.error.id"
          :href="`https://www.opendota.com/matches/${store.error.id}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          Відкрити OpenDota ↗
        </a>
      </div>
    </div>
  </section>
</template>
