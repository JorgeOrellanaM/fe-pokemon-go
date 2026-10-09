<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    message?: string
    icon?: string
  }>(),
  { message: '', icon: 'search_off' },
)
</script>

<template>
  <div class="column items-center text-center q-pa-lg q-gutter-y-sm" role="status">
    <q-icon :name="icon" color="grey-7" size="48px" aria-hidden="true" />
    <h2 class="text-h6 q-my-none">{{ title }}</h2>
    <p v-if="message" class="text-body1 text-grey-8 q-mb-none empty-state__message">
      {{ message }}
    </p>
    <div v-if="$slots.actions" class="row justify-center q-gutter-sm q-pt-sm">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.empty-state__message {
  max-width: 60ch;
}
</style>
