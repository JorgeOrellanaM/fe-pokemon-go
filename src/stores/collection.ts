import { ref } from 'vue'
import { defineStore } from 'pinia'
import { toApiRequestError, type ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import type { LocalPokemon } from '@/types/pokemon'

export type SyncResult =
  | { status: 'created'; pokemon: LocalPokemon }
  | { status: 'already-synced' }
  | { status: 'failed'; error: ApiRequestError }

/**
 * Which Pokémon are in the local collection, as known in this session, and which syncs are
 * in flight. Shared because the catalog, the details page and the collection pages all
 * show and change the same "in collection" state.
 *
 * `syncedIds` is not exhaustive: the collection is paged, so ids are learned from sync
 * results (201/409) and from collection data the user has loaded.
 */
export const useCollectionStore = defineStore('collection', () => {
  const syncedIds = ref(new Set<number>())
  const inFlight = ref(new Map<number, Promise<SyncResult>>())

  const isSynced = (id: number): boolean => syncedIds.value.has(id)
  const isSyncing = (id: number): boolean => inFlight.value.has(id)

  function markSynced(ids: Iterable<number>): void {
    for (const id of ids) syncedIds.value.add(id)
  }

  async function runSync(id: number): Promise<SyncResult> {
    try {
      const pokemon = await localPokemonService.sync(id)
      markSynced([id])
      return { status: 'created', pokemon }
    } catch (err) {
      const error = toApiRequestError(err)
      // 409: a Pokémon can only be synced once. It is already there, which is what the user wants.
      if (error.status === 409) {
        markSynced([id])
        return { status: 'already-synced' }
      }
      return { status: 'failed', error }
    } finally {
      inFlight.value.delete(id)
    }
  }

  /** Syncs one Pokémon. Concurrent calls for the same id share a single request. */
  function sync(id: number): Promise<SyncResult> {
    const pending = inFlight.value.get(id)
    if (pending) return pending
    const request = runSync(id)
    inFlight.value.set(id, request)
    return request
  }

  return { syncedIds, isSynced, isSyncing, markSynced, sync }
})
