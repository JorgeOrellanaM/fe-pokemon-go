<script setup lang="ts">
defineProps<{
  msg: string
}>()
</script>

<template>
  <div class="text-h5 text-primary">{{ msg }}</div>
</template>
