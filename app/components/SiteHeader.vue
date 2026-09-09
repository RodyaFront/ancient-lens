<script setup lang="ts">
const emit = defineEmits<{
  saved: []
  sources: []
}>()

const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const store = useMatchStore()
const { muted, toggleMute } = useScoreAudio()

const homePath = computed(() => localePath({ name: 'index' }))
const onRoot = computed(() => route.path === homePath.value)

const availableLocales = computed(() =>
  (locales.value as Array<{ code: 'en' | 'uk'; name?: string }>).map(
    (entry) => ({
      code: entry.code,
      name: entry.name || entry.code,
    }),
  ),
)
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink v-slot="{ href, navigate }" :to="homePath" custom>
        <a
          :href="href ?? homePath"
          class="brand"
          :aria-label="t('nav.homeAria')"
          @click="navigate"
        >
          ANCIENT <span>LENS</span>
        </a>
      </NuxtLink>
      <p class="brand-context">
        <span class="brand-context-game">Dota 2</span>
        <span class="brand-context-role">{{ t('nav.role') }}</span>
      </p>
      <nav class="site-nav" :aria-label="t('nav.label')">
        <span v-if="onRoot" class="nav-item active" aria-current="page">{{
          t('nav.overview')
        }}</span>
        <NuxtLink v-else class="nav-item" :to="homePath">{{
          t('nav.overview')
        }}</NuxtLink>
        <button
          id="saved-nav"
          class="nav-item"
          type="button"
          @click="emit('saved')"
        >
          {{ t('nav.saved') }}
          <span id="saved-count" class="counter">{{ store.saved.length }}</span>
        </button>
        <button
          id="source-nav"
          class="nav-item"
          type="button"
          @click="emit('sources')"
        >
          {{ t('nav.sources') }}
        </button>
        <button
          class="nav-item nav-mute"
          type="button"
          :class="{ active: muted }"
          :aria-pressed="muted"
          :aria-label="muted ? t('nav.unmute') : t('nav.mute')"
          :title="muted ? t('nav.unmute') : t('nav.mute')"
          @click="toggleMute()"
        >
          <Icon
            :name="muted ? 'lucide:volume-x' : 'lucide:volume-2'"
            aria-hidden="true"
          />
        </button>
        <div class="locale-switch" role="group" :aria-label="t('nav.language')">
          <NuxtLink
            v-for="entry in availableLocales"
            :key="entry.code"
            class="nav-item locale-link"
            :class="{ active: locale === entry.code }"
            :to="switchLocalePath(entry.code)"
            :aria-current="locale === entry.code ? 'true' : undefined"
          >
            {{ entry.code.toUpperCase() }}
          </NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
