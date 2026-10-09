import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Notify, Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import PokemonDetailsView from '@/views/PokemonDetailsView.vue'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import { pokemonService } from '@/services/pokemonService'
import type { PokemonDetails } from '@/types/pokemon'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

vi.mock('@/services/pokemonService', () => ({
  pokemonService: { get: vi.fn<typeof pokemonService.get>() },
}))

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: { sync: vi.fn<typeof localPokemonService.sync>() },
}))

const getMock = vi.mocked(pokemonService.get)
const syncMock = vi.mocked(localPokemonService.sync)

const chain = {
  id: 1,
  name: 'bulbasaur',
  evolvesTo: [{ id: 2, name: 'ivysaur', evolvesTo: [{ id: 3, name: 'venusaur', evolvesTo: [] }] }],
}

function details(id: number, name: string): PokemonDetails {
  return {
    id,
    name,
    imageUrl: null,
    category: 'Seed Pokémon',
    types: ['grass', 'poison'],
    stats: [
      { name: 'hp', value: 45 },
      { name: 'attack', value: 49 },
    ],
    description: 'A strange seed.',
    evolutionChain: chain,
  }
}

const NAMES: Record<number, string> = { 1: 'bulbasaur', 2: 'ivysaur', 3: 'venusaur' }

async function mountAt(url: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/collection/:id', name: 'local-pokemon', component: { template: '<div />' } },
      { path: '/', name: 'pokemon-catalog', component: { template: '<div />' } },
      { path: '/pokemon/:id', name: 'pokemon-details', component: PokemonDetailsView },
    ],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(PokemonDetailsView, {
    global: {
      plugins: [Quasar, createPinia(), router],
      stubs: { QPage: { template: '<main><slot /></main>' } },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

const notFound = new ApiRequestError({
  status: 404,
  message: 'Pokemon with id 9999 was not found',
  errorId: '0c9e5f12',
})

beforeEach(() => {
  syncMock.mockReset()
  vi.mocked(Notify.create).mockClear()
  getMock.mockReset()
  getMock.mockImplementation((id) => Promise.resolve(details(id, NAMES[id] ?? 'missingno')))
})

describe('PokemonDetailsView', () => {
  it('loads and renders the Pokémon from the route id', async () => {
    const { wrapper } = await mountAt('/pokemon/2')

    expect(getMock).toHaveBeenCalledWith(2, expect.any(AbortSignal))
    expect(wrapper.get('h1').text()).toBe('Ivysaur')
    expect(wrapper.text()).toContain('Base stats')
    expect(wrapper.findAll('[role="meter"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('A strange seed.')
    expect(wrapper.get('[data-test="evolution-current"]').text()).toContain('Ivysaur')
  })

  it('keeps the catalog paging in the back link and the evolution links', async () => {
    const { wrapper } = await mountAt('/pokemon/2?page=3&size=10')

    expect(wrapper.get('a[data-test="back"]').attributes('href')).toBe('/?page=3&size=10')
    const links = wrapper.findAll('a[data-test="evolution-link"]').map((a) => a.attributes('href'))
    expect(links).toEqual(['/pokemon/1?page=3&size=10', '/pokemon/3?page=3&size=10'])
  })

  it('shows a loading skeleton while fetching', async () => {
    getMock.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountAt('/pokemon/1')

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.get('section').attributes('aria-busy')).toBe('true')
  })

  it('refetches when the id param changes and cancels the in-flight request', async () => {
    const signals: AbortSignal[] = []
    getMock.mockImplementationOnce((_id, signal) => {
      signals.push(signal!)
      return new Promise(() => {}) // never resolves: stays in flight
    })
    const { wrapper, router } = await mountAt('/pokemon/1')

    await router.push('/pokemon/3')
    await flushPromises()

    expect(signals[0]?.aborted).toBe(true)
    expect(getMock).toHaveBeenLastCalledWith(3, expect.any(AbortSignal))
    expect(wrapper.get('h1').text()).toBe('Venusaur')
  })

  it.each([['abc'], ['0'], ['-4'], ['1.5']])(
    'rejects the invalid id "%s" without calling the API',
    async (id) => {
      const { wrapper } = await mountAt(`/pokemon/${id}`)

      expect(getMock).not.toHaveBeenCalled()
      const alert = wrapper.get('[role="alert"]')
      expect(alert.text()).toContain('Invalid Pokédex number')
      expect(alert.text()).toContain(`“${id}” is not a valid Pokédex number`)
      expect(wrapper.find('[data-test="retry"]').exists()).toBe(false)
    },
  )

  it('shows a not-found state with the error id for 404', async () => {
    getMock.mockRejectedValue(notFound)
    const { wrapper } = await mountAt('/pokemon/9999')

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Pokémon not found')
    expect(alert.text()).toContain('Pokemon with id 9999 was not found')
    expect(wrapper.get('[data-test="error-id"]').text()).toBe('0c9e5f12')
    expect(wrapper.find('[data-test="retry"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Browse the Pokédex')
  })

  it('treats a 400 from the API as an invalid id', async () => {
    getMock.mockRejectedValue(
      new ApiRequestError({
        status: 400,
        message: 'id must be a positive whole number',
        errorId: 'e1',
      }),
    )
    const { wrapper } = await mountAt('/pokemon/5')

    expect(wrapper.get('[role="alert"]').text()).toContain('Invalid Pokédex number')
    expect(wrapper.find('[data-test="retry"]').exists()).toBe(false)
  })

  it('offers a retry for 503 and recovers', async () => {
    getMock.mockRejectedValueOnce(
      new ApiRequestError({
        status: 503,
        message: 'The service is temporarily unavailable. Please try again later.',
        errorId: 'b41d07c3',
      }),
    )
    const { wrapper } = await mountAt('/pokemon/1')

    expect(wrapper.get('[role="alert"]').text()).toContain('b41d07c3')
    await wrapper.get('[data-test="retry"]').trigger('click')
    await flushPromises()

    expect(getMock).toHaveBeenCalledTimes(2)
    expect(wrapper.get('h1').text()).toBe('Bulbasaur')
  })

  it('adds the Pokémon to the collection from the details page', async () => {
    syncMock.mockRejectedValue(new ApiRequestError({ status: 409, message: 'already synced' }))
    const { wrapper, router } = await mountAt('/pokemon/1')

    const button = wrapper.get('[data-test="sync-button"]')
    expect(button.text()).toContain('Add to collection')
    await button.trigger('click')
    await flushPromises()

    expect(syncMock).toHaveBeenCalledWith(1)
    expect(Notify.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'info',
        message: 'Bulbasaur is already in your collection.',
      }),
    )
    const synced = wrapper.get('[data-test="sync-button"]')
    expect(synced.text()).toContain('In collection')
    await synced.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/collection/1')
  })
})
