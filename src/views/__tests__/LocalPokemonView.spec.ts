import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Notify, Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import { logInForTest } from '@/__tests__/authSession'
import LocalPokemonView from '@/views/LocalPokemonView.vue'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import type { LocalPokemon } from '@/types/pokemon'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: {
    get: vi.fn<typeof localPokemonService.get>(),
    sync: vi.fn<typeof localPokemonService.sync>(),
  },
}))

const getMock = vi.mocked(localPokemonService.get)
const syncMock = vi.mocked(localPokemonService.sync)

const pikachu: LocalPokemon = {
  id: 25,
  name: 'pikachu',
  spriteUrl: null,
  category: 'Mouse Pokémon',
  weightKg: 6,
  abilities: [{ name: 'static', hidden: false }],
  localizedName: 'Pikachu',
  region: 'Kanto',
  tags: ['mascot'],
}

const notSynced = new ApiRequestError({
  status: 404,
  message: 'Pokemon with id 150 was not found',
  errorId: '0c9e5f12',
})

async function mountAt(url: string, { loggedIn = true } = {}) {
  const pinia = createPinia()
  if (loggedIn) await logInForTest(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/', name: 'pokemon-catalog', component: { template: '<div />' } },
      { path: '/pokemon/:id', name: 'pokemon-details', component: { template: '<div />' } },
      { path: '/collection', name: 'local-collection', component: { template: '<div />' } },
      { path: '/collection/:id', name: 'local-pokemon', component: LocalPokemonView },
      {
        path: '/collection/:id/edit',
        name: 'local-pokemon-edit',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(LocalPokemonView, {
    global: {
      plugins: [Quasar, pinia, router],
      stubs: { QPage: { template: '<main><slot /></main>' } },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  getMock.mockReset()
  syncMock.mockReset()
  getMock.mockResolvedValue(pikachu)
  vi.mocked(Notify.create).mockClear()
})

describe('LocalPokemonView', () => {
  it('renders the collection entry with its custom fields', async () => {
    const { wrapper } = await mountAt('/collection/25')

    expect(getMock).toHaveBeenCalledWith(25, expect.any(AbortSignal))
    expect(wrapper.get('h1').text()).toBe('Pikachu')
    expect(wrapper.get('[data-test="region"]').text()).toBe('Kanto')
    expect(wrapper.get('[data-test="tags"]').text()).toContain('mascot')
    expect(wrapper.get('a[data-test="full-details"]').attributes('href')).toBe('/pokemon/25')
    expect(wrapper.get('a[data-test="edit"]').attributes('href')).toBe('/collection/25/edit')
  })

  it('returns to the same collection page', async () => {
    const { wrapper } = await mountAt('/collection/25?page=2&size=10')
    expect(wrapper.get('a[data-test="back"]').attributes('href')).toBe('/collection?page=2&size=10')
  })

  it('rejects an invalid id without calling the API', async () => {
    const { wrapper } = await mountAt('/collection/abc')

    expect(getMock).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('Invalid Pokédex number')
  })

  it('offers to add a Pokémon that is not synced yet (404), then shows the entry', async () => {
    getMock.mockRejectedValueOnce(notSynced)
    syncMock.mockResolvedValue({ ...pikachu, id: 150, name: 'mewtwo' })
    getMock.mockResolvedValueOnce({ ...pikachu, id: 150, name: 'mewtwo' })
    const { wrapper } = await mountAt('/collection/150')

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Not in your collection yet')
    expect(wrapper.get('[data-test="error-id"]').text()).toBe('0c9e5f12')
    expect(wrapper.find('[data-test="retry"]').exists()).toBe(false)

    await wrapper.get('[data-test="add-to-collection"]').trigger('click')
    await flushPromises()

    expect(syncMock).toHaveBeenCalledWith(150)
    expect(getMock).toHaveBeenCalledTimes(2)
    expect(wrapper.get('h1').text()).toBe('Mewtwo')
  })

  it('stays on the 404 state when adding fails', async () => {
    getMock.mockRejectedValue(notSynced)
    syncMock.mockRejectedValue(new ApiRequestError({ status: 503, message: 'Unavailable' }))
    const { wrapper } = await mountAt('/collection/150')

    await wrapper.get('[data-test="add-to-collection"]').trigger('click')
    await flushPromises()

    expect(getMock).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Not in your collection yet')
    expect(Notify.create).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'negative' }))
  })
})
