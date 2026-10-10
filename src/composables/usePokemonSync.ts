import { computed } from 'vue'
import { Notify } from 'quasar'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { loginLocation } from '@/router/auth'
import { useAuthStore } from '@/stores/auth'
import { useCollectionStore, type SyncResult } from '@/stores/collection'
import { formatPokedexId, formatPokemonName } from '@/utils/format'

/** Location of a Pokémon's entry in the local collection. */
export function localEntryLink(id: number): RouteLocationRaw {
  return { name: 'local-pokemon', params: { id: String(id) } }
}

/** A sync attempt: the store's result, or `login-required` when the user isn't logged in. */
export type SyncOutcome = SyncResult | { status: 'login-required' }

/**
 * Sync action with user feedback: notifications (announced by screen readers, `role="alert"`)
 * that link to the local entry. A 409 is reported as "already in your collection", not as an
 * error. The state itself lives in the collection store so every view stays consistent.
 *
 * Syncing needs a login (`POST /local-pokemon/{id}/sync` is protected): logged-out users are
 * sent to the login page, which brings them back here afterwards.
 */
export function usePokemonSync() {
  const store = useCollectionStore()
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  function viewAction(id: number) {
    return {
      label: 'View',
      color: 'white',
      noCaps: true,
      handler: () => void router.push(localEntryLink(id)),
    }
  }

  /** `name` is the PokeAPI name; without it the Pokédex number is used in messages. */
  async function sync(id: number, name?: string): Promise<SyncOutcome> {
    const displayName = name ? formatPokemonName(name) : `Pokémon ${formatPokedexId(id)}`
    if (!auth.hasValidSession()) {
      Notify.create({ type: 'info', message: `Log in to add ${displayName} to your collection.` })
      await router.push(loginLocation(route.fullPath))
      return { status: 'login-required' }
    }

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
    } else if (result.error.status !== 401) {
      // A 401 means the session ended: the app already redirects to the login page.
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

  return {
    sync,
    isSynced: store.isSynced,
    isSyncing: store.isSyncing,
    /** Whether the user can sync right now (otherwise `sync` redirects to the login page). */
    canSync: computed(() => auth.isAuthenticated),
  }
}
