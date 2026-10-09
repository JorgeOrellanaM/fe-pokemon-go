import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import LocalCollectionView from '@/views/LocalCollectionView.vue'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import { useCollectionStore } from '@/stores/collection'
import type { Page } from '@/types/api'
import type { LocalPokemon } from '@/types/pokemon'

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: { list: vi.fn<typeof localPokemonService.list>() },
}))

const listMock = vi.mocked(localPokemonService.list)

const bulbasaur: LocalPokemon = {
  id: 1,
  name: 'bulbasaur',
  spriteUrl: null,
  category: 'Seed Pokémon',
  weightKg: 6.9,
  abilities: [{ name: 'overgrow', hidden: false }],
  localizedName: 'Bulbizarre',
  region: 'Kanto',
  tags: ['starter'],
}
const ivysaur: LocalPokemon = {
  ...bulbasaur,
  id: 2,
  name: 'ivysaur',
  localizedName: null,
  region: null,
  tags: [],
}

function pageOf(items: LocalPokemon[], page = 0, size = 20, totalElements = items.length) {
  return {
    items,
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
  } satisfies Page<LocalPokemon>
}

async function mountAt(url: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'pokemon-catalog', component: { template: '<div />' } },
      { path: '/collection', name: 'local-collection', component: LocalCollectionView },
      { path: '/collection/:id', name: 'local-pokemon', component: { template: '<div />' } },
    ],
  })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(LocalCollectionView, {
    global: {
      plugins: [Quasar, pinia, router],
      stubs: { QPage: { template: '<main><slot /></main>' } },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  listMock.mockReset()
  listMock.mockResolvedValue(pageOf([bulbasaur, ivysaur]))
})

describe('LocalCollectionView', () => {
  it('lists the local Pokémon with their custom fields', async () => {
    const { wrapper } = await mountAt('/collection')

    expect(listMock).toHaveBeenCalledWith({ page: 0, size: 20 }, expect.any(AbortSignal))
    const cards = wrapper.findAll('article')
    expect(cards).toHaveLength(2)
    expect(cards[0]?.get('[data-test="localized-name"]').text()).toBe('Bulbizarre')
    expect(cards[0]?.get('[data-test="tags"]').text()).toContain('starter')
    expect(cards[1]?.get('[data-test="region"]').text()).toBe('Not set')
    expect(wrapper.get('[data-test="summary"]').text()).toBe('Showing 1–2 of 2 Pokémon')
  })

  it('reads the paging from the URL and links entries keeping it', async () => {
    listMock.mockResolvedValue(pageOf([bulbasaur], 1, 10, 11))
    const { wrapper } = await mountAt('/collection?page=2&size=10')

    expect(listMock).toHaveBeenCalledWith({ page: 1, size: 10 }, expect.any(AbortSignal))
    expect(wrapper.get('[data-test="card-link"]').attributes('href')).toBe(
      '/collection/1?page=2&size=10',
    )
  })

  it('records the listed ids as synced in the store', async () => {
    await mountAt('/collection')
    const store = useCollectionStore()
    expect(store.isSynced(1)).toBe(true)
    expect(store.isSynced(2)).toBe(true)
    expect(store.isSynced(3)).toBe(false)
  })

  it('guides the user to the Pokédex when the collection is empty', async () => {
    listMock.mockResolvedValue(pageOf([], 0, 20, 0))
    const { wrapper } = await mountAt('/collection')

    expect(wrapper.text()).toContain('Your collection is empty')
    expect(wrapper.text()).toContain('Browse the Pokédex')
  })

  it('shows errors with their id and a retry for 5xx', async () => {
    listMock.mockRejectedValueOnce(
      new ApiRequestError({ status: 500, message: 'An unexpected error occurred.', errorId: 'e5' }),
    )
    const { wrapper } = await mountAt('/collection')

    expect(wrapper.get('[role="alert"]').text()).toContain("We couldn't load your collection")
    expect(wrapper.get('[data-test="error-id"]').text()).toBe('e5')
    await wrapper.get('[data-test="retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(2)
  })
})
