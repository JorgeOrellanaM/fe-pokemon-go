<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, useId, watch } from 'vue'
import type { QInput } from 'quasar'
import FormErrorSummary from '@/components/common/FormErrorSummary.vue'
import PasswordInput from '@/components/auth/PasswordInput.vue'
import { useServerFieldErrors } from '@/composables/useServerFieldErrors'
import type { ApiRequestError } from '@/services/http'
import type { RegisterRequest } from '@/types/auth'
import {
  AUTH_FIELDS,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  normalizeUsername,
  validatePassword,
  validatePasswordConfirmation,
  validateUsername,
} from '@/utils/authForm'

/**
 * Sign-up form. Validates like the backend (AUTH.md §2) as the user goes, maps the server's
 * field errors (400) and a taken username (409) onto the inputs and keeps the typed values on
 * error. Only emits the request; registering is up to the parent.
 */
const props = defineProps<{
  loading: boolean
  serverError: ApiRequestError | null
}>()

const emit = defineEmits<{ submit: [request: RegisterRequest] }>()

type Field = 'username' | 'password' | 'confirmation'
const FIELDS: readonly Field[] = ['username', 'password', 'confirmation']

const uid = useId()
const usernameHintId = `${uid}-username-hint`

const values = reactive<Record<Field, string>>({ username: '', password: '', confirmation: '' })
const touched = reactive<Record<Field, boolean>>({
  username: false,
  password: false,
  confirmation: false,
})
const submitAttempted = ref(false)

const server = useServerFieldErrors(
  AUTH_FIELDS,
  () => props.serverError,
  () => values,
  // 409: the username is taken — show it where the user can fix it.
  (error) =>
    error.status === 409 ? [{ field: 'username', message: error.message }] : error.fieldErrors,
)

const clientErrors = computed<Record<Field, string | null>>(() => ({
  username: validateUsername(values.username),
  password: validatePassword(values.password),
  confirmation: validatePasswordConfirmation(values.password, values.confirmation),
}))

function errorFor(field: Field): string {
  const client = touched[field] || submitAttempted.value ? clientErrors.value[field] : null
  const fromServer = field === 'confirmation' ? [] : server.fields.value[field]
  return [
    ...new Set([client, ...fromServer].filter((message): message is string => !!message)),
  ].join(' ')
}
const errors = computed<Record<Field, string>>(() => ({
  username: errorFor('username'),
  password: errorFor('password'),
  confirmation: errorFor('confirmation'),
}))

/** The username as it will be stored, when it differs from what was typed. */
const normalizedPreview = computed(() => {
  const normalized = normalizeUsername(values.username)
  return normalized && normalized !== values.username && !clientErrors.value.username
    ? normalized
    : null
})

const summary = computed(() => {
  const error = props.serverError
  // A taken username is shown on the input only.
  if (!error || error.status === 409) return null
  return { message: error.message, errorId: error.errorId, details: server.other.value }
})

const usernameRef = ref<QInput | null>(null)
const passwordRef = ref<InstanceType<typeof PasswordInput> | null>(null)
const confirmationRef = ref<InstanceType<typeof PasswordInput> | null>(null)

function focusField(field: Field) {
  if (field === 'username') usernameRef.value?.focus()
  else if (field === 'password') passwordRef.value?.focus()
  else confirmationRef.value?.focus()
}

watch(
  () => props.serverError,
  async (error) => {
    if (!error) return
    await nextTick()
    const invalid = AUTH_FIELDS.find((field) => server.fields.value[field].length > 0)
    if (invalid) focusField(invalid)
  },
)

onMounted(() => focusField('username'))

function onSubmit() {
  submitAttempted.value = true
  const invalid = FIELDS.find((field) => clientErrors.value[field])
  if (invalid) {
    focusField(invalid)
    return
  }
  if (props.loading) return
  emit('submit', { username: normalizeUsername(values.username), password: values.password })
}
</script>

<template>
  <q-form novalidate class="column q-gutter-y-md" @submit.prevent="onSubmit">
    <q-input
      ref="usernameRef"
      v-model="values.username"
      label="Username"
      outlined
      bg-color="white"
      autocomplete="username"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      :disable="loading"
      :error="!!errors.username"
      :error-message="errors.username"
      :aria-describedby="usernameHintId"
      data-test="username-input"
      @blur="touched.username = true"
    >
      <template #prepend>
        <q-icon name="person" aria-hidden="true" />
      </template>
      <template #hint>
        <span :id="usernameHintId">
          <template v-if="normalizedPreview">
            You'll log in as <strong data-test="username-preview">{{ normalizedPreview }}</strong
            >.
          </template>
          <template v-else>
            {{ USERNAME_MIN_LENGTH }}–{{ USERNAME_MAX_LENGTH }} characters: letters, digits, “.”,
            “_” or “-”.
          </template>
        </span>
      </template>
    </q-input>

    <PasswordInput
      ref="passwordRef"
      v-model="values.password"
      label="Password"
      autocomplete="new-password"
      :hint="`At least ${PASSWORD_MIN_LENGTH} characters (at most ${PASSWORD_MAX_BYTES} bytes).`"
      :disable="loading"
      :error="!!errors.password"
      :error-message="errors.password"
      data-test="password-input"
      @blur="touched.password = true"
    />

    <PasswordInput
      ref="confirmationRef"
      v-model="values.confirmation"
      label="Confirm password"
      autocomplete="new-password"
      :disable="loading"
      :error="!!errors.confirmation"
      :error-message="errors.confirmation"
      data-test="confirmation-input"
      @blur="touched.confirmation = true"
    />

    <FormErrorSummary
      v-if="summary"
      :message="summary.message"
      :details="summary.details"
      :error-id="summary.errorId"
    />

    <q-btn
      type="submit"
      unelevated
      no-caps
      color="primary"
      size="lg"
      icon="person_add"
      label="Create account"
      class="full-width"
      :loading="loading"
      data-test="submit"
    />
  </q-form>
</template>
