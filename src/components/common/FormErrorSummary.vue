<script setup lang="ts">
/** Why the last form submit didn't go through. Announced by screen readers (`role="alert"`). */
withDefaults(
  defineProps<{
    message: string
    /** Extra lines, e.g. server errors for fields the form doesn't show. */
    details?: string[]
    errorId?: string | null
  }>(),
  { details: () => [], errorId: null },
)
</script>

<template>
  <div
    class="form-summary q-pa-md rounded-borders text-body2"
    role="alert"
    data-test="form-summary"
  >
    <div class="row items-start no-wrap">
      <q-icon
        name="error_outline"
        color="negative"
        size="20px"
        class="q-mr-sm"
        aria-hidden="true"
      />
      <div>
        <div class="text-weight-medium" data-test="form-summary-message">{{ message }}</div>
        <ul v-if="details.length" class="q-my-xs q-pl-md">
          <li v-for="detail in details" :key="detail">{{ detail }}</li>
        </ul>
        <div v-if="errorId" class="text-grey-8">
          Error ID:
          <code class="text-tabular" data-test="form-error-id">{{ errorId }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-summary {
  border: 1px solid var(--q-negative);
  border-left-width: 4px;
  background: #fff;
}
</style>
