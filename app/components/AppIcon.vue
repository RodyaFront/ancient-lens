<script setup lang="ts">
/* eslint-disable vue/no-v-html -- icon markup is a static trusted path map */
import { iconPaths } from '~/utils/iconPaths'

const props = defineProps<{
  name: string
  class?: string
}>()

const markup = computed(() => iconPaths[props.name] ?? iconPaths.info)
</script>

<template>
  <svg
    :class="props.class"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="markup"
  />
</template>
