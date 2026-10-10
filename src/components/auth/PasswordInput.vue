<script setup lang="ts">
import { ref } from 'vue'
import type { QInput } from 'quasar'

/**
 * Password field with a show/hide toggle. Other attributes (label, hint, error, autocomplete…)
 * go to the underlying `q-input`.
 */
const model = defineModel<string>({ required: true })

const visible = ref(false)
const inputRef = ref<QInput | null>(null)

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <q-input
    ref="inputRef"
    v-model="model"
    :type="visible ? 'text' : 'password'"
    outlined
    bg-color="white"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
  >
    <template #prepend>
      <q-icon name="lock" aria-hidden="true" />
    </template>
    <template #append>
      <q-btn
        flat
        round
        :icon="visible ? 'visibility_off' : 'visibility'"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        :aria-pressed="visible ? 'true' : 'false'"
        data-test="toggle-password"
        @click="visible = !visible"
      />
    </template>
  </q-input>
</template>
