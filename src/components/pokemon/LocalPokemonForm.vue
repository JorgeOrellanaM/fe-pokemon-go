<script setup lang="ts">
import { computed, nextTick, reactive, ref, shallowRef, useId, watch } from 'vue'
import type { QInput } from 'quasar'
import TagInput from '@/components/form/TagInput.vue'
import type { ApiRequestError } from '@/services/http'
import type { UpdateLocalPokemonRequest } from '@/types/pokemon'
import {
  FORM_FIELDS,
  LOCALIZED_NAME_MAX_LENGTH,
  REGION_MAX_LENGTH,
  TAGS_MAX_COUNT,
  TAG_MAX_LENGTH,
  emptyFieldMessages,
  hasFieldMessages,
  isSameRequest,
  mapServerFieldErrors,
  toUpdateRequest,
  validateForm,
  validateNewTag,
  type FieldMessages,
  type FormField,
  type LocalPokemonFormValues,
} from '@/utils/localPokemonForm'

/**
 * Edit form for the custom fields. Validates like the backend, maps server field errors onto
 * the inputs and keeps the typed values on error. It only emits the trimmed request; saving
 * is up to the parent.
 */
const props = defineProps<{
  initial: LocalPokemonFormValues
  saving: boolean
  /** Error of the last save attempt (field errors are shown on the inputs). */
  serverError: ApiRequestError | null
}>()

const emit = defineEmits<{ submit: [request: UpdateLocalPokemonRequest]; cancel: [] }>()

/** True while the values differ from `initial` (for the unsaved-changes guard). */
const dirty = defineModel<boolean>('dirty', { default: false })

const uid = useId()
const ids = {
  nameCounter: `${uid}-name-counter`,
  regionCounter: `${uid}-region-counter`,
  summary: `${uid}-summary`,
}

const values = reactive<LocalPokemonFormValues>({ localizedName: '', region: '', tags: [] })

function setValues(source: LocalPokemonFormValues) {
  values.localizedName = source.localizedName
  values.region = source.region
  values.tags = [...source.tags]
}
setValues(props.initial)
watch(() => props.initial, setValues)

const isDirty = computed(() => !isSameRequest(values, props.initial))
watch(isDirty, (value) => (dirty.value = value), { immediate: true })

// Client-side errors are shown live (they only appear past a limit, next to the counters).
const clientErrors = computed(() => validateForm(values))

// Server errors stay on a field until the user edits that field.
const serverFieldErrors = shallowRef<FieldMessages>(emptyFieldMessages())
const serverOtherErrors = ref<string[]>([])
const submitAttempted = ref(false)

function messagesFor(field: FormField): string[] {
  return [...new Set([...clientErrors.value[field], ...serverFieldErrors.value[field]])]
}
const fieldErrors = computed<FieldMessages>(() => ({
  localizedName: messagesFor('localizedName'),
  region: messagesFor('region'),
  tags: messagesFor('tags'),
}))

function clearServerErrors(field: FormField) {
  if (serverFieldErrors.value[field].length === 0) return
  serverFieldErrors.value = { ...serverFieldErrors.value, [field]: [] }
}
watch(
  () => values.localizedName,
  () => clearServerErrors('localizedName'),
)
watch(
  () => values.region,
  () => clearServerErrors('region'),
)
watch(
  () => [...values.tags],
  () => clearServerErrors('tags'),
)

const nameRef = ref<QInput | null>(null)
const regionRef = ref<QInput | null>(null)
const tagsRef = ref<InstanceType<typeof TagInput> | null>(null)

async function focusFirstInvalid() {
  await nextTick()
  const first = FORM_FIELDS.find((field) => fieldErrors.value[field].length > 0)
  if (first === 'localizedName') nameRef.value?.focus()
  else if (first === 'region') regionRef.value?.focus()
  else if (first === 'tags') tagsRef.value?.focus()
}

watch(
  () => props.serverError,
  (error) => {
    const mapped = mapServerFieldErrors(error?.fieldErrors ?? [])
    serverFieldErrors.value = mapped.fields
    serverOtherErrors.value = mapped.other
    if (hasFieldMessages(mapped.fields)) void focusFirstInvalid()
  },
)

/** Summary shown above the actions: why the last submit didn't go through. */
const summary = computed(() => {
  if (props.serverError) {
    return {
      message: props.serverError.message,
      errorId: props.serverError.errorId,
      details: serverOtherErrors.value,
    }
  }
  if (submitAttempted.value && hasFieldMessages(fieldErrors.value)) {
    return { message: 'Please fix the highlighted fields.', errorId: null, details: [] }
  }
  return null
})

const canSubmit = computed(() => isDirty.value && !props.saving)

function onSubmit() {
  submitAttempted.value = true
  const pendingOk = tagsRef.value?.commitPending() ?? true
  if (!pendingOk) {
    void nextTick(() => tagsRef.value?.focus())
    return
  }
  if (hasFieldMessages(clientErrors.value)) {
    void focusFirstInvalid()
    return
  }
  if (!isDirty.value || props.saving) return
  emit('submit', toUpdateRequest(values))
}

function resetChanges() {
  setValues(props.initial)
  serverFieldErrors.value = emptyFieldMessages()
  submitAttempted.value = false
}

function clearAll() {
  setValues({ localizedName: '', region: '', tags: [] })
}

const nameLength = computed(() => values.localizedName.trim().length)
const regionLength = computed(() => values.region.trim().length)
</script>

<template>
  <q-form novalidate class="column q-gutter-y-md" @submit.prevent="onSubmit">
    <q-input
      ref="nameRef"
      v-model="values.localizedName"
      label="Localized name"
      hint="Optional. The name used in your language, e.g. “Bulbizarre”."
      outlined
      bg-color="white"
      autocomplete="off"
      :disable="saving"
      :error="fieldErrors.localizedName.length > 0"
      :error-message="fieldErrors.localizedName.join(' ')"
      :aria-describedby="ids.nameCounter"
      data-test="localized-name-input"
    >
      <template #counter>
        <span
          :id="ids.nameCounter"
          class="text-tabular"
          :class="{ 'text-negative': nameLength > LOCALIZED_NAME_MAX_LENGTH }"
        >
          {{ nameLength }} / {{ LOCALIZED_NAME_MAX_LENGTH }}
          <span class="sr-only">characters</span>
        </span>
      </template>
    </q-input>

    <q-input
      ref="regionRef"
      v-model="values.region"
      label="Region"
      hint="Optional. Where it is found, e.g. “Kanto”."
      outlined
      bg-color="white"
      autocomplete="off"
      :disable="saving"
      :error="fieldErrors.region.length > 0"
      :error-message="fieldErrors.region.join(' ')"
      :aria-describedby="ids.regionCounter"
      data-test="region-input"
    >
      <template #counter>
        <span
          :id="ids.regionCounter"
          class="text-tabular"
          :class="{ 'text-negative': regionLength > REGION_MAX_LENGTH }"
        >
          {{ regionLength }} / {{ REGION_MAX_LENGTH }}
          <span class="sr-only">characters</span>
        </span>
      </template>
    </q-input>

    <TagInput
      ref="tagsRef"
      v-model="values.tags"
      label="Tags"
      :max-tags="TAGS_MAX_COUNT"
      :max-length="TAG_MAX_LENGTH"
      :validate="validateNewTag"
      :errors="fieldErrors.tags"
      :disable="saving"
    />

    <div
      v-if="summary"
      :id="ids.summary"
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
          <div class="text-weight-medium">{{ summary.message }}</div>
          <ul v-if="summary.details.length" class="q-my-xs q-pl-md">
            <li v-for="detail in summary.details" :key="detail">{{ detail }}</li>
          </ul>
          <div v-if="summary.errorId" class="text-grey-8">
            Error ID:
            <code class="text-tabular" data-test="form-error-id">{{ summary.errorId }}</code>
          </div>
        </div>
      </div>
    </div>

    <div class="row items-center justify-between q-gutter-sm">
      <div class="row q-gutter-sm">
        <q-btn
          flat
          no-caps
          color="grey-8"
          icon="undo"
          label="Reset changes"
          :disable="!isDirty || saving"
          data-test="reset"
          @click="resetChanges"
        />
        <q-btn
          flat
          no-caps
          color="grey-8"
          icon="backspace"
          label="Clear all"
          :disable="saving"
          data-test="clear"
          @click="clearAll"
        />
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          outline
          no-caps
          color="secondary"
          label="Cancel"
          :disable="saving"
          data-test="cancel"
          @click="emit('cancel')"
        />
        <q-btn
          type="submit"
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Save changes"
          :loading="saving"
          :disable="!canSubmit"
          data-test="save"
        />
      </div>
    </div>
  </q-form>
</template>

<style scoped>
.form-summary {
  border: 1px solid var(--q-negative);
  border-left-width: 4px;
  background: #fff;
}
</style>
