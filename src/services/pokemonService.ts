import { apiGet } from '@/services/http'
import type { Page, PageRequest } from '@/types/api'
import type { PokemonDetails, PokemonSummary } from '@/types/pokemon'

/** PokeAPI catalog endpoints (`/pokemon`). */
export const pokemonService = {
  /** Browse the catalog, ordered by Pokédex number. */
  list(request: PageRequest, signal?: AbortSignal): Promise<Page<PokemonSummary>> {
    return apiGet<Page<PokemonSummary>>(
      '/pokemon',
      { page: request.page, size: request.size },
      signal,
    )
  },

  /** Detailed view of one Pokémon by Pokédex number. */
  get(id: number, signal?: AbortSignal): Promise<PokemonDetails> {
    return apiGet<PokemonDetails>(`/pokemon/${id}`, undefined, signal)
  },
}
