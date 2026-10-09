<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { QInput } from 'quasar'

/**
 * Text input that turns entries into removable chips. Enter or comma adds the typed tag,
 * pasted comma-separated text adds several. `validate` decides whether a tag can be added
 * (duplicates, length, max count) and its message is shown inline.
 */
const props = withDefaults(
  defineProps<{
    label: string
    maxTags: number
    maxLength: number
    /** Returns why a tag can't be added, or `null`. */
    validate: (tag: string, tags: readonly string[]) => string | null
    /** Errors from outside (form validation / server), shown under the input. */
    errors?: string[]
    disable?: boolean
  }>(),
  { errors: () => [], disable: false },
)

const tags = defineModel<string[]>({ required: true })

const uid = useId()
const hintId = `${uid}-hint`
const counterId = `${uid}-counter`

const text = ref('')
const addError = ref<string | null>(null)
const announcement = ref('')
const inputRef = ref<QInput | null>(null)

const lengthError = computed(() =>
  text.value.trim().length > props.maxLength
    ? `Each tag must be at most ${props.maxLength} characters.`
    : null,
)
const messages = computed(() => {
  const local = lengthError.value ?? addError.value
  return [...(local ? [local] : []), ...props.errors]
})
const isFull = computed(() => tags.value.length >= props.maxTags)

function announce(message: string) {
  // Re-set so the same message is announced again.
  announcement.value = ''
  requestAnimationFrame(() => (announcement.value = message))
}

/**
 * Adds every comma-separated entry of the typed text. Entries that can't be added stay in the
 * input with the reason shown. Returns `false` when something was rejected.
 */
function addFromText(): boolean {
  // Build the new list first: the model only updates after the parent re-renders.
  const next = [...tags.value]
  const added: string[] = []
  const rejected: string[] = []
  let error: string | null = null

  for (const part of text.value.split(',')) {
    const tag = part.trim()
    if (!tag) continue
    const reason = props.validate(tag, next)
    if (reason) {
      error ??= reason
      rejected.push(tag)
    } else {
      next.push(tag)
      added.push(tag)
    }
  }

  if (added.length) {
    tags.value = next
    announce(`Added ${added.length === 1 ? 'tag' : 'tags'} ${added.join(', ')}.`)
  }
  addError.value = error
  text.value = rejected.join(', ')
  return rejected.length === 0
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault() // Enter must not submit the form.
    addFromText()
  }
}

function onInput(value: string | number | null) {
  text.value = value === null ? '' : String(value)
  addError.value = null
  if (text.value.includes(',')) addFromText() // pasted "a, b, c"
}

function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
  announce(`Removed tag ${tag}.`)
  inputRef.value?.focus()
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  /** Adds any typed text; `false` when it is invalid (so the form can stop the submit). */
  commitPending: addFromText,
})
</script>

<template>
  <div class="tag-input">
    <q-input
      ref="inputRef"
      :model-value="text"
      :label="label"
      outlined
      bg-color="white"
      :disable="disable || isFull"
      :error="messages.length > 0"
      :error-message="messages.join(' ')"
      :aria-describedby="`${hintId} ${counterId}`"
      data-test="tag-text"
      @update:model-value="onInput"
      @keydown="onKeydown"
      @blur="addFromText"
    >
      <template #append>
        <q-btn
          flat
          round
          dense
          icon="add"
          aria-label="Add tag"
          :disable="disable || isFull || !text.trim()"
          data-test="add-tag"
          @click="addFromText"
        />
      </template>
      <template #counter>
        <span :id="counterId" class="text-tabular">{{ tags.length }} / {{ maxTags }} tags</span>
      </template>
    </q-input>
    <div :id="hintId" class="text-caption text-grey-8 q-mt-xs">
      {{
        isFull
          ? `You've reached the maximum of ${maxTags} tags. Remove one to add another.`
          : 'Press Enter or type a comma to add a tag.'
      }}
    </div>

    <ul
      v-if="tags.length"
      class="tag-input__chips row q-gutter-xs q-mt-xs"
      :aria-label="`${label}: ${tags.length} added`"
      data-test="tag-chips"
    >
      <li v-for="tag in tags" :key="tag">
        <q-chip
          removable
          outline
          color="secondary"
          icon="sell"
          class="q-ma-none"
          :disable="disable"
          :remove-aria-label="`Remove tag ${tag}`"
          :ripple="false"
          @remove="removeTag(tag)"
        >
          {{ tag }}
        </q-chip>
      </li>
    </ul>

    <span class="sr-only" aria-live="polite" data-test="tag-announcer">{{ announcement }}</span>
  </div>
</template>

<style scoped>
.tag-input__chips {
  list-style: none;
  padding: 0;
  margin-bottom: 0;
}
</style>
