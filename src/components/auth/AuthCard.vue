<script setup lang="ts">
/** Centered card shared by the login and register pages. */
defineProps<{
  title: string
  subtitle: string
  icon: string
}>()
</script>

<template>
  <div class="auth-card q-mx-auto">
    <q-card flat bordered>
      <q-card-section class="text-center q-pt-lg">
        <q-avatar size="56px" color="primary" text-color="white" :icon="icon" aria-hidden="true" />
        <h1 class="q-mt-md q-mb-xs" :class="$q.screen.xs ? 'text-h5' : 'text-h4'">{{ title }}</h1>
        <p class="text-body2 text-grey-8 q-mb-none">{{ subtitle }}</p>
      </q-card-section>
      <q-card-section class="q-pt-sm">
        <slot />
      </q-card-section>
      <template v-if="$slots.footer">
        <q-separator />
        <q-card-section class="text-center text-body2">
          <slot name="footer" />
        </q-card-section>
      </template>
    </q-card>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 440px;
}
</style>
