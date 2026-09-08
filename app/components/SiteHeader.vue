<script setup lang="ts">
const emit = defineEmits<{
  saved: []
  sources: []
}>()

const route = useRoute()
const store = useMatchStore()

const onRoot = computed(() => route.path === '/')
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink v-slot="{ href, navigate }" to="/" custom>
        <a
          :href="href ?? '/'"
          class="brand"
          aria-label="Ancient Lens — головна"
          @click="navigate"
        >
          ANCIENT <span>LENS</span>
        </a>
      </NuxtLink>
      <p class="brand-context">
        <span class="brand-context-game">Dota 2</span>
        <span class="brand-context-role">Статистика матчів</span>
      </p>
      <nav class="site-nav" aria-label="Навігація">
        <span v-if="onRoot" class="nav-item active" aria-current="page"
          >Огляд</span
        >
        <NuxtLink v-else class="nav-item" to="/">Огляд</NuxtLink>
        <button
          id="saved-nav"
          class="nav-item"
          type="button"
          @click="emit('saved')"
        >
          Збережені
          <span id="saved-count" class="counter">{{ store.saved.length }}</span>
        </button>
        <button
          id="source-nav"
          class="nav-item"
          type="button"
          @click="emit('sources')"
        >
          Про дані
        </button>
      </nav>
    </div>
  </header>
</template>
