<script setup lang="ts">
const store = useMatchStore()
</script>

<template>
  <div v-if="store.toast" id="toast" role="status">
    {{ store.toast }}
  </div>
</template>
