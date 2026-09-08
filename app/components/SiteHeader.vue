<script setup lang="ts">
const emit = defineEmits<{
  saved: []
  sources: []
}>()

const store = useMatchStore()
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink class="brand" to="/" aria-label="Ancient Lens — головна">
        ANCIENT <span>LENS</span>
      </NuxtLink>
      <span class="brand-context">Dota 2<br />Статистика матчів</span>
      <nav class="site-nav" aria-label="Навігація">
        <a class="nav-item active" href="#match-search" aria-current="page"
          >Огляд</a
        >
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
