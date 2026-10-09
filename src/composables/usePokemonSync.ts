import { Notify } from 'quasar'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useCollectionStore, type SyncResult } from '@/stores/collection'
import { formatPokedexId, formatPokemonName } from '@/utils/format'

/** Location of a Pokémon's entry in the local collection. */
export function localEntryLink(id: number): RouteLocationRaw {
  return { name: 'local-pokemon', params: { id: String(id) } }
}

/**
 * Sync action with user feedback: notifications (announced by screen readers, `role="alert"`)
 * that link to the local entry. A 409 is reported as "already in your collection", not as an
 * error. The state itself lives in the collection store so every view stays consistent.
 */
export function usePokemonSync() {
  const store = useCollectionStore()
  const router = useRouter()

  function viewAction(id: number) {
    return {
      label: 'View',
      color: 'white',
      noCaps: true,
      handler: () => void router.push(localEntryLink(id)),
    }
  }

  /** `name` is the PokeAPI name; without it the Pokédex number is used in messages. */
  async function sync(id: number, name?: string): Promise<SyncResult> {
    const displayName = name ? formatPokemonName(name) : `Pokémon ${formatPokedexId(id)}`
    const result = await store.sync(id)

    if (result.status === 'created') {
      Notify.create({
        type: 'positive',
        message: `${displayName} was added to your collection.`,
        actions: [viewAction(id)],
      })
    } else if (result.status === 'already-synced') {
      Notify.create({
        type: 'info',
        message: `${displayName} is already in your collection.`,
        actions: [viewAction(id)],
      })
    } else {
      const { error } = result
      Notify.create({
        type: 'negative',
        message: `Couldn't add ${displayName}: ${error.message}`,
        caption: error.errorId ? `Error ID: ${error.errorId}` : undefined,
        timeout: 8000,
        actions: error.retryable
          ? [{ label: 'Retry', color: 'white', noCaps: true, handler: () => void sync(id, name) }]
          : [{ icon: 'close', color: 'white', round: true, 'aria-label': 'Dismiss' }],
      })
    }
    return result
  }

  return { sync, isSynced: store.isSynced, isSyncing: store.isSyncing }
}
