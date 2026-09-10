<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Hub pages use h2 so the article keeps a single h1. */
    embedded?: boolean
  }>(),
  { embedded: false },
)

const { t } = useI18n()
const store = useMatchStore()
const input = ref(store.lastInput)
const errorTitle = useTemplateRef<HTMLElement>('errorTitle')

watch(
  () => store.lastInput,
  (value) => {
    input.value = value
  },
)

async function submit() {
  await store.openMatchInput(input.value)
  if (!store.inputInvalid) {
    return
  }
  await nextTick()
  errorTitle.value?.focus()
}
</script>

<template>
  <section
    id="match-search"
    class="search-section"
    :class="{ 'search-section--embedded': embedded }"
    aria-labelledby="search-title"
  >
    <div class="search-heading">
      <component
        :is="embedded ? 'h2' : 'h1'"
        id="search-title"
        class="search-heading__title"
      >
        {{ embedded ? t('search.embeddedTitle') : t('search.title') }}
      </component>
      <p>{{ embedded ? t('search.embeddedBlurb') : t('search.blurb') }}</p>
    </div>
    <div class="search-controls">
      <form
        id="search-form"
        novalidate
        :aria-busy="store.loading ? 'true' : undefined"
        @submit.prevent="submit"
      >
        <label for="match-input">{{ t('search.label') }}</label>
        <div class="search-box" :class="{ 'is-busy': store.loading }">
          <input
            id="match-input"
            v-model="input"
            type="text"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('search.placeholder')"
            aria-describedby="input-help"
            :aria-invalid="store.inputInvalid ? 'true' : undefined"
            :aria-errormessage="store.error ? 'match-input-error' : undefined"
            :disabled="store.loading"
          />
          <button class="primary" type="submit" :disabled="store.loading">
            {{ store.loading ? t('search.submitting') : t('search.submit') }}
          </button>
        </div>
      </form>
      <div class="input-footer">
        <span id="input-help">{{ t('search.help') }}</span>
      </div>
    </div>
    <div
      v-if="store.error"
      id="match-input-error"
      class="error-box"
      role="alert"
    >
      <strong ref="errorTitle" tabindex="-1">{{ store.error.title }}</strong>
      <p>{{ store.error.body }}</p>
      <div v-if="store.error.actions" class="error-actions">
        <button
          type="button"
          @click="store.openMatchInput(store.error.id || input)"
        >
          {{ t('search.retry') }}
        </button>
        <a
          v-if="store.error.id"
          :href="`https://www.opendota.com/matches/${store.error.id}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('search.openInSource') }}
        </a>
      </div>
    </div>
  </section>
</template>
