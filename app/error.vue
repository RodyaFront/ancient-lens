<script setup lang="ts">
const error = useError()

const title = computed(() => {
  if (error.value?.statusCode === 404) {
    return 'Сторінку не знайдено'
  }

  return 'Щось пішло не так'
})

function handleClear() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-dvh px-6 py-16">
    <p class="text-accent text-sm">{{ error?.statusCode ?? 500 }}</p>
    <h1 class="mt-2 text-3xl font-semibold">{{ title }}</h1>
    <button class="primary mt-6" type="button" @click="handleClear">
      На головну
    </button>
  </div>
</template>
