<script setup lang="ts">
const appStore = useAppStore()

useSeoMeta({
  title: 'Главная',
  description: 'Production Vue 3 + Nuxt приложение',
})
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
    <p class="text-accent text-sm tracking-[0.08em] uppercase">Ancient Lens</p>
    <h1 class="text-4xl leading-none font-semibold tracking-tight">
      Продакшн-стек Vue 3 + Nuxt
    </h1>
    <p class="text-ink-muted max-w-xl text-lg">
      SSR, TypeScript, Tailwind CSS v4, Pinia, SEO и security-заголовки уже
      подключены для полноценного Nuxt-приложения.
    </p>
    <p class="text-ink-muted text-sm">{{ appStore.stackLabel }}</p>
  </main>
</template>
