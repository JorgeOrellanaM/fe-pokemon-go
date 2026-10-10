<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { useQuasar } from 'quasar'
import ErrorState from '@/components/common/ErrorState.vue'
import PokemonDetailsSkeleton from '@/components/pokemon/PokemonDetailsSkeleton.vue'
import PokemonEvolutionChain from '@/components/pokemon/PokemonEvolutionChain.vue'
import PokemonProfile from '@/components/pokemon/PokemonProfile.vue'
import PokemonStats from '@/components/pokemon/PokemonStats.vue'
import SyncPokemonButton from '@/components/pokemon/SyncPokemonButton.vue'
import { useAsyncResource } from '@/composables/useAsyncResource'
import { localEntryLink, usePokemonSync } from '@/composables/usePokemonSync'
import { pokemonService } from '@/services/pokemonService'
import { formatPokemonName } from '@/utils/format'
import { parsePagingQuery, toPagingQuery } from '@/utils/paging'
import { parsePokemonId } from '@/utils/pokemonId'

const $q = useQuasar()
const route = useRoute()

const { data, loading, error, load, retry, reset } = useAsyncResource(pokemonService.get)
const { sync, isSynced, isSyncing, canSync } = usePokemonSync()

const rawId = computed(() => {
  const param = route.params.id
  return (Array.isArray(param) ? param[0] : param) ?? ''
})
const pokemonId = computed(() => parsePokemonId(route.params.id))

// The catalog's page/size travel along in the query so "Back" returns to the same page.
const catalogQuery = computed(() => toPagingQuery(parsePagingQuery(route.query)))
const backTo = computed<RouteLocationRaw>(() => ({
  name: 'pokemon-catalog',
  query: catalogQuery.value,
}))
function linkFor(id: number): RouteLocationRaw {
  return { name: 'pokemon-details', params: { id: String(id) }, query: catalogQuery.value }
}

// Move focus to the content after in-page navigation (e.g. an evolution link), whose link
// would otherwise disappear and drop focus to <body>.
const contentRef = ref<HTMLElement | null>(null)
let focusOnLoad = false

watch(
  () => route.params.id,
  (_id, previousId) => {
    focusOnLoad = previousId !== undefined
    const id = pokemonId.value
    if (id === null) {
      reset() // Never call the API with an invalid id; also cancels any in-flight request.
      return
    }
    void load(id)
  },
  { immediate: true },
)

watch(data, async (value) => {
  if (!value || !focusOnLoad) return
  focusOnLoad = false
  await nextTick()
  contentRef.value?.focus()
})

const isInvalidId = computed(() => pokemonId.value === null || error.value?.status === 400)

const errorTitle = computed(() => {
  if (isInvalidId.value) return 'Invalid Pokédex number'
  if (error.value?.status === 404) return 'Pokémon not found'
  return "We couldn't load this Pokémon"
})

const errorMessage = computed(() => {
  if (pokemonId.value === null) {
    return `“${rawId.value}” is not a valid Pokédex number. Use a positive whole number, such as 25.`
  }
  return error.value?.message ?? ''
})

const showError = computed(() => pokemonId.value === null || (!loading.value && !!error.value))
</script>

<template>
  <q-page padding>
    <div class="details q-mx-auto">
      <div class="row items-center justify-between q-gutter-sm q-mb-md">
        <q-btn
          flat
          no-caps
          color="secondary"
          icon="arrow_back"
          label="Back to Pokédex"
          :to="backTo"
          data-test="back"
        />
        <SyncPokemonButton
          v-if="data && pokemonId !== null && !loading"
          :pokemon-name="formatPokemonName(data.name)"
          :synced="isSynced(pokemonId)"
          :syncing="isSyncing(pokemonId)"
          :login-required="!canSync"
          :to="localEntryLink(pokemonId)"
          @sync="sync(data.id, data.name)"
        />
      </div>

      <section aria-label="Pokémon details" :aria-busy="loading">
        <q-card v-if="showError" flat bordered>
          <ErrorState
            :title="errorTitle"
            :message="errorMessage"
            :error-id="error?.errorId"
            :retryable="!isInvalidId && !!error?.retryable"
            @retry="retry"
          >
            <template #actions>
              <q-btn outline no-caps color="secondary" label="Browse the Pokédex" :to="backTo" />
            </template>
          </ErrorState>
        </q-card>

        <div v-else-if="loading" data-test="loading">
          <span class="sr-only" role="status">Loading Pokémon details…</span>
          <PokemonDetailsSkeleton />
        </div>

        <div
          v-else-if="data && pokemonId !== null"
          ref="contentRef"
          tabindex="-1"
          class="details__content row q-col-gutter-md"
          data-test="details"
        >
          <div class="col-12 col-md-5">
            <q-card flat bordered class="full-height">
              <q-card-section>
                <PokemonProfile :pokemon="data" :image-size="$q.screen.xs ? 200 : 240" />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-7">
            <q-card flat bordered class="full-height">
              <q-card-section>
                <h2 class="text-h6 q-mt-none q-mb-md">Base stats</h2>
                <PokemonStats :stats="data.stats" />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12">
            <q-card flat bordered>
              <q-card-section>
                <h2 class="text-h6 q-mt-none q-mb-md">Evolution chain</h2>
                <PokemonEvolutionChain
                  :chain="data.evolutionChain"
                  :current-id="pokemonId"
                  :link-for="linkFor"
                  :vertical="$q.screen.xs"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>

<style scoped>
.details {
  max-width: 1200px;
}

/* Focus is moved here programmatically; the region itself is not an interactive control. */
.details__content:focus {
  outline: none;
}
</style>
