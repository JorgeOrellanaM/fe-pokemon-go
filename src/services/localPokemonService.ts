import { apiGet, apiRequest } from '@/services/http'
import type { Page, PageRequest } from '@/types/api'
import type { LocalPokemon, UpdateLocalPokemonRequest } from '@/types/pokemon'

/** Local collection endpoints (`/local-pokemon`): Pokémon copied into the local database. */
export const localPokemonService = {
  /** Copies one Pokémon from PokeAPI into the local DB. `409` when it is already synced. */
  sync(id: number, signal?: AbortSignal): Promise<LocalPokemon> {
    return apiRequest<LocalPokemon>(`/local-pokemon/${id}/sync`, { method: 'POST', signal })
  },

  /** Pokémon stored locally, ordered by Pokédex number. */
  list(request: PageRequest, signal?: AbortSignal): Promise<Page<LocalPokemon>> {
    return apiGet<Page<LocalPokemon>>(
      '/local-pokemon',
      { page: request.page, size: request.size },
      signal,
    )
  },

  /** One locally stored Pokémon. `404` when it has not been synced yet. */
  get(id: number, signal?: AbortSignal): Promise<LocalPokemon> {
    return apiGet<LocalPokemon>(`/local-pokemon/${id}`, undefined, signal)
  },

  /**
   * Replaces ALL custom fields (full-replace: a missing field clears it). Only the three
   * custom fields are sent; unknown fields are rejected with `400`.
   */
  update(
    id: number,
    request: UpdateLocalPokemonRequest,
    signal?: AbortSignal,
  ): Promise<LocalPokemon> {
    const body: UpdateLocalPokemonRequest = {
      localizedName: request.localizedName,
      region: request.region,
      tags: request.tags,
    }
    return apiRequest<LocalPokemon>(`/local-pokemon/${id}`, { method: 'PUT', body, signal })
  },
}
