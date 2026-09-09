<script setup lang="ts">
defineProps<{
  scepterOwned: boolean
  shardOwned: boolean
}>()
</script>

<template>
  <div class="aghanim-pair">
    <MatchAghanimSlot kind="scepter" :owned="scepterOwned" />
    <MatchAghanimSlot kind="shard" :owned="shardOwned" />
  </div>
</template>
