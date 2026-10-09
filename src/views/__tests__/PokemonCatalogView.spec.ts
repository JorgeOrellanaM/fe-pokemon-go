import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Notify, Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import PokemonCatalogView from '@/views/PokemonCatalogView.vue'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import { pokemonService } from '@/services/pokemonService'
import type { Page } from '@/types/api'
import type { PokemonSummary } from '@/types/pokemon'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

vi.mock('@/services/pokemonService', () => ({
  pokemonService: { list: vi.fn<typeof pokemonService.list>() },
}))

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: { sync: vi.fn<typeof localPokemonService.sync>() },
}))

const listMock = vi.mocked(pokemonService.list)
const syncMock = vi.mocked(localPokemonService.sync)

function pokemon(id: number): PokemonSummary {
  return {
    id,
    name: `pokemon-${id}`,
    spriteUrl: null,
    category: 'Test Pokémon',
    weightKg: id,
    abilities: [{ name: 'overgrow', hidden: false }],
  }
}

function pageOf(page: number, size: number, totalElements = 100): Page<PokemonSummary> {
  const first = page * size + 1
  const count = Math.max(0, Math.min(size, totalElements - page * size))
  return {
    items: Array.from({ length: count }, (_, i) => pokemon(first + i)),
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
  }
}

async function mountAt(url: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/collection/:id', name: 'local-pokemon', component: { template: '<div />' } },
      { path: '/', name: 'pokemon-catalog', component: PokemonCatalogView },
      { path: '/pokemon/:id', name: 'pokemon-details', component: { template: '<div />' } },
    ],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(PokemonCatalogView, {
    global: {
      plugins: [Quasar, createPinia(), router],
      // QPage must live inside a QLayout; it is irrelevant for these tests.
      stubs: { QPage: { template: '<main><slot /></main>' } },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  syncMock.mockReset()
  vi.mocked(Notify.create).mockClear()
  listMock.mockReset()
  listMock.mockImplementation((req) => Promise.resolve(pageOf(req.page, req.size)))
})

describe('PokemonCatalogView', () => {
  it('loads the page and size from the route query (1-based in the URL)', async () => {
    const { wrapper } = await mountAt('/?page=2&size=10')

    expect(listMock).toHaveBeenCalledWith({ page: 1, size: 10 }, expect.any(AbortSignal))
    expect(wrapper.findAll('article')).toHaveLength(10)
    expect(wrapper.get('[data-test="summary"]').text()).toBe('Showing 11–20 of 100 Pokémon')
  })

  it('links each card to its details page, keeping the catalog paging', async () => {
    const { wrapper } = await mountAt('/?page=2&size=10')

    const link = wrapper.get('[data-test="card-link"]')
    expect(link.attributes('href')).toBe('/pokemon/11?page=2&size=10')
    expect(link.text()).toBe('Pokemon 11')
  })

  it('uses the defaults and cleans up an invalid query', async () => {
    const { router } = await mountAt('/?page=abc&size=500')

    expect(listMock).toHaveBeenCalledWith({ page: 0, size: 20 }, expect.any(AbortSignal))
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('navigates when a page is selected in the pagination', async () => {
    const { wrapper, router } = await mountAt('/')

    await wrapper.get('button[aria-label="3"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ page: '3' })
    expect(listMock).toHaveBeenLastCalledWith({ page: 2, size: 20 }, expect.any(AbortSignal))
  })

  it('shows the error message and id, and retries on 503', async () => {
    listMock.mockRejectedValueOnce(
      new ApiRequestError({
        status: 503,
        message: 'The service is temporarily unavailable. Please try again later.',
        errorId: 'b41d07c3',
      }),
    )
    const { wrapper } = await mountAt('/')

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('The service is temporarily unavailable')
    expect(alert.text()).toContain('b41d07c3')
    expect(wrapper.find('[data-test="pokemon-list"]').exists()).toBe(false)

    await wrapper.get('[data-test="retry"]').trigger('click')
    await flushPromises()

    expect(listMock).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('article')).toHaveLength(20)
  })

  it('does not offer a retry for client errors', async () => {
    listMock.mockRejectedValueOnce(
      new ApiRequestError({ status: 400, message: 'size must be between 1 and 50', errorId: 'x' }),
    )
    const { wrapper } = await mountAt('/')

    expect(wrapper.find('[data-test="retry"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Back to first page')
  })

  it('explains when the requested page is past the last one', async () => {
    const { wrapper } = await mountAt('/?page=99')

    expect(wrapper.text()).toContain("This page doesn't exist")
    expect(wrapper.text()).toContain('There are 5 pages')
  })

  it('shows an empty state when the catalog is empty', async () => {
    listMock.mockResolvedValue(pageOf(0, 20, 0))
    const { wrapper } = await mountAt('/')

    expect(wrapper.text()).toContain('No Pokémon found')
  })

  describe('sync from a card', () => {
    const firstSyncButton = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) =>
      wrapper.findAll('[data-test="sync-button"]')[0]!

    it('adds the Pokémon and switches the button to "In collection" (201)', async () => {
      syncMock.mockResolvedValue({ ...pokemon(1), localizedName: null, region: null, tags: [] })
      const { wrapper } = await mountAt('/')

      expect(firstSyncButton(wrapper).text()).toContain('Add to collection')
      await firstSyncButton(wrapper).trigger('click')
      await flushPromises()

      expect(syncMock).toHaveBeenCalledWith(1)
      expect(firstSyncButton(wrapper).text()).toContain('In collection')
      expect(Notify.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'positive',
          message: 'Pokemon 1 was added to your collection.',
        }),
      )
    })

    it('treats an already synced Pokémon as in the collection (409)', async () => {
      syncMock.mockRejectedValue(new ApiRequestError({ status: 409, message: 'already synced' }))
      const { wrapper } = await mountAt('/')

      await firstSyncButton(wrapper).trigger('click')
      await flushPromises()

      expect(firstSyncButton(wrapper).text()).toContain('In collection')
      expect(Notify.create).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'info' }))
    })

    it('keeps the add action and reports the error (503)', async () => {
      syncMock.mockRejectedValue(
        new ApiRequestError({ status: 503, message: 'Unavailable', errorId: 'b41d07c3' }),
      )
      const { wrapper } = await mountAt('/')

      await firstSyncButton(wrapper).trigger('click')
      await flushPromises()

      expect(firstSyncButton(wrapper).text()).toContain('Add to collection')
      expect(Notify.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'negative', caption: 'Error ID: b41d07c3' }),
      )
    })
  })
})
