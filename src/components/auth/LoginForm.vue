<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import type { QInput } from 'quasar'
import FormErrorSummary from '@/components/common/FormErrorSummary.vue'
import PasswordInput from '@/components/auth/PasswordInput.vue'
import { useServerFieldErrors } from '@/composables/useServerFieldErrors'
import type { ApiRequestError } from '@/services/http'
import type { LoginRequest } from '@/types/auth'
import { AUTH_FIELDS, validateRequired, type AuthField } from '@/utils/authForm'

/**
 * Username + password form. Only checks that both are filled in (the backend doesn't apply the
 * register format rules on login); server errors are shown on the inputs and in a summary.
 * Logging in is up to the parent.
 */
const props = withDefaults(
  defineProps<{
    loading: boolean
    /** Error of the last attempt, e.g. 401 "Invalid username or password.". */
    serverError: ApiRequestError | null
    initialUsername?: string
  }>(),
  { initialUsername: '' },
)

const emit = defineEmits<{ submit: [request: LoginRequest] }>()

const values = reactive<Record<AuthField, string>>({
  username: props.initialUsername,
  password: '',
})
const touched = reactive<Record<AuthField, boolean>>({ username: false, password: false })
const submitAttempted = ref(false)

const server = useServerFieldErrors(
  AUTH_FIELDS,
  () => props.serverError,
  () => values,
)

const clientErrors = computed<Record<AuthField, string | null>>(() => ({
  username: validateRequired(values.username, 'username'),
  password: values.password ? null : 'Enter your password.',
}))

function errorFor(field: AuthField): string {
  const client = touched[field] || submitAttempted.value ? clientErrors.value[field] : null
  return [client, ...server.fields.value[field]].filter(Boolean).join(' ')
}
const usernameError = computed(() => errorFor('username'))
const passwordError = computed(() => errorFor('password'))

const summary = computed(() => {
  const error = props.serverError
  if (!error) return null
  return { message: error.message, errorId: error.errorId, details: server.other.value }
})

const usernameRef = ref<QInput | null>(null)
const passwordRef = ref<InstanceType<typeof PasswordInput> | null>(null)

function focusField(field: AuthField) {
  if (field === 'username') usernameRef.value?.focus()
  else passwordRef.value?.focus()
}

// After a failed attempt: focus the field to fix (the password, for wrong credentials).
watch(
  () => props.serverError,
  async (error) => {
    if (!error) return
    await nextTick()
    const invalid = AUTH_FIELDS.find((field) => server.fields.value[field].length > 0)
    // Other failures (network, 5xx) keep the focus on the submit button, ready to retry.
    if (invalid) focusField(invalid)
    else if (error.status === 401) focusField('password')
  },
)

onMounted(() => focusField(values.username ? 'password' : 'username'))

function onSubmit() {
  submitAttempted.value = true
  const invalid = AUTH_FIELDS.find((field) => clientErrors.value[field])
  if (invalid) {
    focusField(invalid)
    return
  }
  if (props.loading) return
  emit('submit', { username: values.username, password: values.password })
}

/** Lets the page fill in the demo account. */
function fill(request: LoginRequest) {
  values.username = request.username
  values.password = request.password
  void nextTick(() => focusField('password'))
}

defineExpose({ fill })
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
      :error="!!usernameError"
      :error-message="usernameError"
      data-test="username-input"
      @blur="touched.username = true"
    >
      <template #prepend>
        <q-icon name="person" aria-hidden="true" />
      </template>
    </q-input>

    <PasswordInput
      ref="passwordRef"
      v-model="values.password"
      label="Password"
      autocomplete="current-password"
      :disable="loading"
      :error="!!passwordError"
      :error-message="passwordError"
      data-test="password-input"
      @blur="touched.password = true"
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
      icon="login"
      label="Log in"
      class="full-width"
      :loading="loading"
      data-test="submit"
    />
  </q-form>
</template>
