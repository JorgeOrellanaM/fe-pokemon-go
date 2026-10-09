import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet, apiRequest } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'

vi.mock('@/services/http', () => ({
  apiGet: vi.fn<typeof apiGet>(),
  apiRequest: vi.fn<typeof apiRequest>(),
}))

beforeEach(() => {
  vi.mocked(apiGet).mockReset()
  vi.mocked(apiRequest).mockReset()
})

describe('localPokemonService', () => {
  it('sync() POSTs to the sync endpoint without a body', async () => {
    const created = { id: 6, name: 'charizard' }
    vi.mocked(apiRequest).mockResolvedValue(created)

    await expect(localPokemonService.sync(6)).resolves.toBe(created)
    expect(apiRequest).toHaveBeenCalledWith('/local-pokemon/6/sync', {
      method: 'POST',
      signal: undefined,
    })
  })

  it('list() GETs the local list with the paging params', async () => {
    const page = { items: [], page: 1, size: 10, totalElements: 0, totalPages: 0 }
    vi.mocked(apiGet).mockResolvedValue(page)
    const signal = new AbortController().signal

    await expect(localPokemonService.list({ page: 1, size: 10 }, signal)).resolves.toBe(page)
    expect(apiGet).toHaveBeenCalledWith('/local-pokemon', { page: 1, size: 10 }, signal)
  })

  it('get() GETs one local Pokémon', async () => {
    const entry = { id: 25, name: 'pikachu' }
    vi.mocked(apiGet).mockResolvedValue(entry)
    const signal = new AbortController().signal

    await expect(localPokemonService.get(25, signal)).resolves.toBe(entry)
    expect(apiGet).toHaveBeenCalledWith('/local-pokemon/25', undefined, signal)
  })

  it('update() PUTs exactly the three custom fields (full replace)', async () => {
    const updated = { id: 25, name: 'pikachu' }
    vi.mocked(apiRequest).mockResolvedValue(updated)
    const signal = new AbortController().signal
    const request = { localizedName: 'Pikachu', region: null, tags: ['mascot'], extra: 'nope' }

    await expect(localPokemonService.update(25, request, signal)).resolves.toBe(updated)
    expect(apiRequest).toHaveBeenCalledWith('/local-pokemon/25', {
      method: 'PUT',
      body: { localizedName: 'Pikachu', region: null, tags: ['mascot'] },
      signal,
    })
  })
})
