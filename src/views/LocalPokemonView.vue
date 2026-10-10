<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import ErrorState from '@/components/common/ErrorState.vue'
import LocalPokemonFields from '@/components/pokemon/LocalPokemonFields.vue'
import PokemonCard from '@/components/pokemon/PokemonCard.vue'
import PokemonCardSkeleton from '@/components/pokemon/PokemonCardSkeleton.vue'
import { useLocalPokemonEntry } from '@/composables/useLocalPokemonEntry'
import { usePokemonSync } from '@/composables/usePokemonSync'
import { useAuthStore } from '@/stores/auth'

const { sync, isSyncing, canSync } = usePokemonSync()
const auth = useAuthStore()
const {
  data,
  loading,
  error,
  load,
  retry,
  rawId,
  pokemonId,
  collectionLink,
  editLink,
  isInvalidId,
  isNotSynced,
  showError,
  errorMessage,
} = useLocalPokemonEntry()

const detailsTo = computed<RouteLocationRaw>(() => ({
  name: 'pokemon-details',
  params: { id: rawId.value },
}))

const errorTitle = computed(() => {
  if (isInvalidId.value) return 'Invalid Pokédex number'
  if (isNotSynced.value) return 'Not in your collection yet'
  return "We couldn't load this collection entry"
})

/** From the 404 state: add the Pokémon, then show its new entry. */
async function addToCollection() {
  const id = pokemonId.value
  if (id === null) return
  const result = await sync(id)
  if (result.status === 'created' || result.status === 'already-synced') await load(id)
}
</script>

<template>
  <q-page padding>
    <div class="local-entry q-mx-auto">
      <q-btn
        flat
        no-caps
        color="secondary"
        icon="arrow_back"
        label="Back to my collection"
        :to="collectionLink"
        class="q-mb-md"
        data-test="back"
      />

      <section aria-label="Collection entry" :aria-busy="loading">
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
                v-if="isNotSynced && pokemonId !== null"
                unelevated
                no-caps
                color="primary"
                label="Add to collection"
                :icon="canSync ? 'bookmark_add' : 'lock'"
                :aria-label="canSync ? undefined : 'Log in to add to your collection'"
                :loading="isSyncing(pokemonId)"
                data-test="add-to-collection"
                @click="addToCollection"
              />
              <q-btn
                outline
                no-caps
                color="secondary"
                label="Browse the Pokédex"
                :to="{ name: 'pokemon-catalog' }"
              />
            </template>
          </ErrorState>
        </q-card>

        <div v-else-if="loading" data-test="loading">
          <span class="sr-only" role="status">Loading collection entry…</span>
          <PokemonCardSkeleton />
        </div>

        <PokemonCard v-else-if="data" :pokemon="data" heading-tag="h1" data-test="entry">
          <template #extra>
            <h2 class="text-subtitle1 text-weight-medium q-mt-none q-mb-sm">Your details</h2>
            <LocalPokemonFields :pokemon="data" />
          </template>
          <template #actions>
            <q-btn
              flat
              no-caps
              color="secondary"
              icon="visibility"
              label="View full details"
              :to="detailsTo"
              data-test="full-details"
            />
            <q-btn
              unelevated
              no-caps
              color="primary"
              :icon="auth.isAuthenticated ? 'edit' : 'lock'"
              label="Edit details"
              :aria-label="auth.isAuthenticated ? undefined : 'Log in to edit details'"
              :to="editLink"
              data-test="edit"
            >
              <!-- The edit route requires a login: the guard sends the user to log in first. -->
              <q-tooltip v-if="!auth.isAuthenticated">Log in to edit your details</q-tooltip>
            </q-btn>
          </template>
        </PokemonCard>
      </section>
    </div>
  </q-page>
</template>

<style scoped>
.local-entry {
  max-width: 640px;
}
</style>
