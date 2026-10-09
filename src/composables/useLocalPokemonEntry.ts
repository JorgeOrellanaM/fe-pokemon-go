import { computed, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { useAsyncResource } from '@/composables/useAsyncResource'
import { localPokemonService } from '@/services/localPokemonService'
import { useCollectionStore } from '@/stores/collection'
import { parsePagingQuery, toPagingQuery } from '@/utils/paging'
import { parsePokemonId } from '@/utils/pokemonId'

/**
 * Loads the local Pokémon named by the `:id` route param (entry and edit pages): validates the
 * id, refetches when it changes, classifies errors and keeps the collection's paging in links
 * so "Back" returns to the same collection page.
 */
export function useLocalPokemonEntry() {
  const route = useRoute()
  const collection = useCollectionStore()
  const resource = useAsyncResource(localPokemonService.get)
  const { data, loading, error, load, reset } = resource

  const rawId = computed(() => {
    const param = route.params.id
    return (Array.isArray(param) ? param[0] : param) ?? ''
  })
  const pokemonId = computed(() => parsePokemonId(route.params.id))

  const collectionQuery = computed(() => toPagingQuery(parsePagingQuery(route.query)))
  const collectionLink = computed<RouteLocationRaw>(() => ({
    name: 'local-collection',
    query: collectionQuery.value,
  }))
  const entryLink = computed<RouteLocationRaw>(() => ({
    name: 'local-pokemon',
    params: { id: rawId.value },
    query: collectionQuery.value,
  }))
  const editLink = computed<RouteLocationRaw>(() => ({
    name: 'local-pokemon-edit',
    params: { id: rawId.value },
    query: collectionQuery.value,
  }))

  watch(
    () => route.params.id,
    () => {
      const id = pokemonId.value
      if (id === null) {
        reset() // Never call the API with an invalid id; also cancels any in-flight request.
        return
      }
      void load(id)
    },
    { immediate: true },
  )

  watch(data, (pokemon) => {
    if (pokemon) collection.markSynced([pokemon.id])
  })

  const isInvalidId = computed(() => pokemonId.value === null || error.value?.status === 400)
  const isNotSynced = computed(() => error.value?.status === 404)
  const showError = computed(() => pokemonId.value === null || (!loading.value && !!error.value))

  const errorMessage = computed(() =>
    pokemonId.value === null
      ? `“${rawId.value}” is not a valid Pokédex number. Use a positive whole number, such as 25.`
      : (error.value?.message ?? ''),
  )

  return {
    ...resource,
    rawId,
    pokemonId,
    collectionLink,
    entryLink,
    editLink,
    isInvalidId,
    isNotSynced,
    showError,
    errorMessage,
  }
}
