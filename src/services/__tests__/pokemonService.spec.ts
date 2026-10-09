import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '@/services/http'
import { pokemonService } from '@/services/pokemonService'

vi.mock('@/services/http', () => ({ apiGet: vi.fn<typeof apiGet>() }))

beforeEach(() => {
  vi.mocked(apiGet).mockReset()
})

describe('pokemonService.list', () => {
  it('calls the catalog endpoint with the paging params and signal', async () => {
    const page = { items: [], page: 2, size: 10, totalElements: 0, totalPages: 0 }
    vi.mocked(apiGet).mockResolvedValue(page)
    const signal = new AbortController().signal

    await expect(pokemonService.list({ page: 2, size: 10 }, signal)).resolves.toBe(page)
    expect(apiGet).toHaveBeenCalledWith('/pokemon', { page: 2, size: 10 }, signal)
  })
})

describe('pokemonService.get', () => {
  it('calls the details endpoint with the id and signal', async () => {
    const details = { id: 25, name: 'pikachu' }
    vi.mocked(apiGet).mockResolvedValue(details)
    const signal = new AbortController().signal

    await expect(pokemonService.get(25, signal)).resolves.toBe(details)
    expect(apiGet).toHaveBeenCalledWith('/pokemon/25', undefined, signal)
  })
})
