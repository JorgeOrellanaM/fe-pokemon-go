import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import { useCollectionStore } from '@/stores/collection'
import type { LocalPokemon } from '@/types/pokemon'

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: { sync: vi.fn<typeof localPokemonService.sync>() },
}))

const syncMock = vi.mocked(localPokemonService.sync)

const charizard: LocalPokemon = {
  id: 6,
  name: 'charizard',
  spriteUrl: null,
  category: 'Flame Pokémon',
  weightKg: 90.5,
  abilities: [],
  localizedName: null,
  region: null,
  tags: [],
}

beforeEach(() => {
  setActivePinia(createPinia())
  syncMock.mockReset()
})

describe('collection store', () => {
  it('marks the Pokémon as synced on 201', async () => {
    syncMock.mockResolvedValue(charizard)
    const store = useCollectionStore()

    const result = await store.sync(6)

    expect(result).toEqual({ status: 'created', pokemon: charizard })
    expect(store.isSynced(6)).toBe(true)
    expect(store.isSyncing(6)).toBe(false)
  })

  it('treats 409 as "already synced", not as a failure', async () => {
    syncMock.mockRejectedValue(
      new ApiRequestError({ status: 409, message: 'Pokemon with id 6 is already synced' }),
    )
    const store = useCollectionStore()

    await expect(store.sync(6)).resolves.toEqual({ status: 'already-synced' })
    expect(store.isSynced(6)).toBe(true)
  })

  it('reports other errors and leaves the Pokémon unsynced', async () => {
    const error = new ApiRequestError({ status: 503, message: 'Unavailable', errorId: 'abc' })
    syncMock.mockRejectedValue(error)
    const store = useCollectionStore()

    await expect(store.sync(6)).resolves.toEqual({ status: 'failed', error })
    expect(store.isSynced(6)).toBe(false)
    expect(store.isSyncing(6)).toBe(false)
  })

  it('tracks the in-flight state and shares one request between concurrent calls', async () => {
    let resolve!: (value: LocalPokemon) => void
    syncMock.mockReturnValue(new Promise((res) => (resolve = res)))
    const store = useCollectionStore()

    const first = store.sync(6)
    const second = store.sync(6)
    expect(store.isSyncing(6)).toBe(true)
    expect(syncMock).toHaveBeenCalledTimes(1)

    resolve(charizard)
    expect(await first).toEqual(await second)
    expect(store.isSyncing(6)).toBe(false)
  })

  it('markSynced() records ids learned from collection data', () => {
    const store = useCollectionStore()
    store.markSynced([1, 4, 7])
    expect(store.isSynced(4)).toBe(true)
    expect(store.isSynced(5)).toBe(false)
  })
})
