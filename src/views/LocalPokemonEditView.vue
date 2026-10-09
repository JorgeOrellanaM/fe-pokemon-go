<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import ErrorState from '@/components/common/ErrorState.vue'
import LocalPokemonForm from '@/components/pokemon/LocalPokemonForm.vue'
import PokemonImage from '@/components/pokemon/PokemonImage.vue'
import { useLocalPokemonEntry } from '@/composables/useLocalPokemonEntry'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { toApiRequestError, type ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import type { UpdateLocalPokemonRequest } from '@/types/pokemon'
import { formatPokedexId, formatPokemonName } from '@/utils/format'
import { toFormValues } from '@/utils/localPokemonForm'

const router = useRouter()
const {
  data,
  loading,
  error,
  retry,
  pokemonId,
  collectionLink,
  entryLink,
  isInvalidId,
  isNotSynced,
  showError,
  errorMessage,
} = useLocalPokemonEntry()

const displayName = computed(() => (data.value ? formatPokemonName(data.value.name) : ''))
const initialValues = computed(() => (data.value ? toFormValues(data.value) : null))

const errorTitle = computed(() => {
  if (isInvalidId.value) return 'Invalid Pokédex number'
  if (isNotSynced.value) return 'Not in your collection'
  return "We couldn't load this collection entry"
})

// --- Saving -------------------------------------------------------------------------------
const dirty = ref(false)
const saving = ref(false)
const saveError = shallowRef<ApiRequestError | null>(null)
/** Set when the entry disappeared (404) while saving. */
const removedError = shallowRef<ApiRequestError | null>(null)
let leavingAfterSave = false
let saveController: AbortController | null = null

useUnsavedChangesGuard(() => dirty.value && !leavingAfterSave && !removedError.value)
onBeforeUnmount(() => saveController?.abort())

async function save(request: UpdateLocalPokemonRequest) {
  const id = pokemonId.value
  if (id === null || saving.value) return

  const controller = new AbortController()
  saveController = controller
  saving.value = true
  saveError.value = null
  try {
    await localPokemonService.update(id, request, controller.signal)
    Notify.create({ type: 'positive', message: `Your changes to ${displayName.value} were saved.` })
    leavingAfterSave = true
    // Replace: "Back" from the entry shouldn't reopen a form that was just saved.
    await router.replace(entryLink.value)
  } catch (err) {
    if (controller.signal.aborted) return
    const failure = toApiRequestError(err)
    if (failure.status === 404) removedError.value = failure
    else saveError.value = failure // field errors are mapped onto the inputs by the form
  } finally {
    if (saveController === controller) saveController = null
    saving.value = false
  }
}

function cancel() {
  void router.push(entryLink.value) // the guard asks first when there are unsaved changes
}
</script>

<template>
  <q-page padding>
    <div class="local-edit q-mx-auto">
      <q-btn
        flat
        no-caps
        color="secondary"
        icon="arrow_back"
        label="Back to entry"
        :to="entryLink"
        class="q-mb-md"
        data-test="back"
      />

      <section aria-label="Edit collection entry" :aria-busy="loading || saving">
        <q-card v-if="showError" flat bordered>
          <ErrorState
            :title="errorTitle"
            :message="errorMessage"
            :error-id="error?.errorId"
            :retryable="!isInvalidId && !isNotSynced && !!error?.retryable"
            @retry="retry"
          >
            <template #actions>
              <q-btn
                outline
                no-caps
                color="secondary"
                label="Back to my collection"
                :to="collectionLink"
              />
            </template>
          </ErrorState>
        </q-card>

        <q-card v-else-if="removedError" flat bordered data-test="removed">
          <ErrorState
            title="No longer in your collection"
            :message="`${displayName} was removed from your collection, so your changes couldn't be saved. ${removedError.message}`"
            :error-id="removedError.errorId"
          >
            <template #actions>
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Back to my collection"
                :to="collectionLink"
              />
            </template>
          </ErrorState>
        </q-card>

        <div v-else-if="loading" data-test="loading">
          <span class="sr-only" role="status">Loading collection entry…</span>
          <q-card flat bordered>
            <q-card-section>
              <q-skeleton type="text" class="text-h5" width="50%" />
              <q-skeleton type="QInput" class="q-mt-md" />
              <q-skeleton type="QInput" class="q-mt-md" />
              <q-skeleton type="QInput" class="q-mt-md" />
            </q-card-section>
          </q-card>
        </div>

        <q-card v-else-if="data && initialValues" flat bordered>
          <q-card-section class="row items-center no-wrap">
            <PokemonImage
              :src="data.spriteUrl"
              :alt="`${displayName} sprite`"
              :placeholder-label="`No sprite available for ${displayName}`"
              :size="72"
              :lazy="false"
            />
            <div class="q-ml-md">
              <div class="text-caption text-grey-8 text-tabular">
                {{ formatPokedexId(data.id) }}
              </div>
              <h1 class="q-my-none" :class="$q.screen.xs ? 'text-h6' : 'text-h5'">
                Edit {{ displayName }}
              </h1>
              <p class="text-body2 text-grey-8 q-mb-none">
                Your own details for this Pokémon. Empty fields are cleared.
              </p>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <LocalPokemonForm
              v-model:dirty="dirty"
              :initial="initialValues"
              :saving="saving"
              :server-error="saveError"
              @submit="save"
              @cancel="cancel"
            />
          </q-card-section>
        </q-card>
      </section>
    </div>
  </q-page>
</template>

<style scoped>
.local-edit {
  max-width: 720px;
}
</style>
