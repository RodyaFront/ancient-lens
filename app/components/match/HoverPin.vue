<script setup lang="ts">
defineProps<{
  sticky?: boolean
}>()
</script>

<template>
  <Transition name="hover-card-pin">
    <img
      v-if="sticky"
      class="hover-card-pin"
      src="/images/dota2/pin.png"
      alt=""
      width="46"
      height="46"
      decoding="async"
      aria-hidden="true"
    />
  </Transition>
</template>
