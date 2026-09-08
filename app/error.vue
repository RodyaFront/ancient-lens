<script setup lang="ts">
const error = useError()

const title = computed(() => {
  if (error.value?.statusCode === 404) {
    return 'Страница не найдена'
  }

  return 'Что-то пошло не так'
})

function handleClear() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div
    class="bg-surface text-ink flex min-h-dvh flex-col items-start justify-center gap-4 px-6"
  >
    <p class="text-accent text-sm">{{ error?.statusCode ?? 500 }}</p>
    <h1 class="text-3xl font-semibold">{{ title }}</h1>
    <button
      class="bg-accent text-surface rounded-md px-4 py-2 text-sm font-medium"
      type="button"
      @click="handleClear"
    >
      На главную
    </button>
  </div>
</template>
