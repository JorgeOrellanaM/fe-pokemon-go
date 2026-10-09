<script setup lang="ts">
import { copyToClipboard, useQuasar } from 'quasar'

const props = withDefaults(
  defineProps<{
    message: string
    title?: string
    errorId?: string | null
    retryable?: boolean
    retrying?: boolean
  }>(),
  { title: 'Something went wrong', errorId: null, retryable: false, retrying: false },
)

const emit = defineEmits<{ retry: [] }>()

const $q = useQuasar()

async function copyErrorId() {
  if (!props.errorId) return
  try {
    await copyToClipboard(props.errorId)
    $q.notify?.({ message: 'Error ID copied', color: 'positive', icon: 'check', timeout: 1500 })
  } catch {
    $q.notify?.({ message: 'Could not copy the error ID', color: 'negative', icon: 'error' })
  }
}
</script>

<template>
  <div class="column items-center text-center q-pa-lg q-gutter-y-sm" role="alert">
    <q-icon name="error_outline" color="negative" size="48px" aria-hidden="true" />
    <h2 class="text-h6 q-my-none">{{ title }}</h2>
    <p class="text-body1 q-mb-none error-state__message">{{ message }}</p>

    <div v-if="errorId" class="row items-center justify-center text-body2 text-grey-8">
      <span>
        Error ID: <code class="text-tabular" data-test="error-id">{{ errorId }}</code>
      </span>
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="content_copy"
        class="q-ml-xs"
        aria-label="Copy error ID"
        @click="copyErrorId"
      >
        <q-tooltip>Copy error ID</q-tooltip>
      </q-btn>
    </div>

    <div class="row justify-center q-gutter-sm q-pt-sm">
      <q-btn
        v-if="retryable"
        unelevated
        no-caps
        color="primary"
        icon="refresh"
        label="Try again"
        :loading="retrying"
        data-test="retry"
        @click="emit('retry')"
      />
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.error-state__message {
  max-width: 60ch;
}
</style>
