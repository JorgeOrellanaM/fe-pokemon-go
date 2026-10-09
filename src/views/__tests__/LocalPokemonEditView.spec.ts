import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Dialog, Notify, Quasar } from 'quasar'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'
import LocalPokemonEditView from '@/views/LocalPokemonEditView.vue'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import type { LocalPokemon } from '@/types/pokemon'

// Plugins only get their API once installed: replace them with spies.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
  Dialog: { create: vi.fn<(typeof import('quasar'))['Dialog']['create']>() },
}))

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: {
    get: vi.fn<typeof localPokemonService.get>(),
    update: vi.fn<typeof localPokemonService.update>(),
  },
}))

const getMock = vi.mocked(localPokemonService.get)
const updateMock = vi.mocked(localPokemonService.update)

const bulbasaur: LocalPokemon = {
  id: 1,
  name: 'bulbasaur',
  spriteUrl: null,
  category: 'Seed Pokémon',
  weightKg: 6.9,
  abilities: [],
  localizedName: 'Bulbizarre',
  region: 'Kanto',
  tags: ['starter'],
}

/** Makes the unsaved-changes dialog answer "discard" (`true`) or "keep editing". */
function answerDialog(discard: boolean) {
  vi.mocked(Dialog.create).mockImplementation(() => {
    const chain = {
      onOk: (fn: () => void) => {
        if (discard) fn()
        return chain
      },
      onCancel: (fn: () => void) => {
        if (!discard) fn()
        return chain
      },
    }
    return chain as unknown as ReturnType<typeof Dialog.create>
  })
}

let wrapper: VueWrapper | undefined

async function mountAt(url: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'pokemon-catalog', component: { template: '<div />' } },
      { path: '/collection', name: 'local-collection', component: { template: '<div />' } },
      { path: '/collection/:id', name: 'local-pokemon', component: { template: '<div />' } },
      { path: '/collection/:id/edit', name: 'local-pokemon-edit', component: LocalPokemonEditView },
    ],
  })
  await router.push(url)
  await router.isReady()
  wrapper = mount(RouterView, {
    global: {
      plugins: [Quasar, createPinia(), router],
      stubs: { QPage: { template: '<main><slot /></main>' } },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, router }
}

const regionInput = (w: VueWrapper) => w.get('input[data-test="region-input"]')
const submit = async (w: VueWrapper) => {
  await w.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  getMock.mockReset()
  updateMock.mockReset()
  vi.mocked(Notify.create).mockClear()
  vi.mocked(Dialog.create).mockReset()
  getMock.mockResolvedValue(bulbasaur)
})

afterEach(() => wrapper?.unmount())

describe('LocalPokemonEditView', () => {
  it('loads the entry into the form', async () => {
    const { wrapper } = await mountAt('/collection/1/edit')

    expect(getMock).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect(wrapper.get('h1').text()).toBe('Edit Bulbasaur')
    expect((regionInput(wrapper).element as HTMLInputElement).value).toBe('Kanto')
  })

  it('saves the trimmed values, confirms and returns to the entry (200)', async () => {
    updateMock.mockResolvedValue({ ...bulbasaur, region: 'Johto' })
    const { wrapper, router } = await mountAt('/collection/1/edit?page=2')

    await regionInput(wrapper).setValue('  Johto ')
    await submit(wrapper)

    expect(updateMock).toHaveBeenCalledWith(
      1,
      { localizedName: 'Bulbizarre', region: 'Johto', tags: ['starter'] },
      expect.any(AbortSignal),
    )
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'positive',
        message: 'Your changes to Bulbasaur were saved.',
      }),
    )
    expect(Dialog.create).not.toHaveBeenCalled() // no unsaved-changes prompt after saving
    expect(router.currentRoute.value.fullPath).toBe('/collection/1?page=2')
  })

  it('shows server field errors on the inputs and keeps the values (400)', async () => {
    updateMock.mockRejectedValue(
      new ApiRequestError({
        status: 400,
        message: 'Please check the highlighted fields.',
        errorId: '7a2be9d0',
        fieldErrors: [{ field: 'region', message: 'must be at most 100 characters' }],
      }),
    )
    const { wrapper, router } = await mountAt('/collection/1/edit')

    await regionInput(wrapper).setValue('Johto')
    await submit(wrapper)

    expect(router.currentRoute.value.path).toBe('/collection/1/edit')
    expect(regionInput(wrapper).attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Must be at most 100 characters.')
    expect(wrapper.get('[data-test="form-error-id"]').text()).toBe('7a2be9d0')
    expect((regionInput(wrapper).element as HTMLInputElement).value).toBe('Johto')
  })

  it('explains that the entry is gone when saving returns 404', async () => {
    updateMock.mockRejectedValue(
      new ApiRequestError({
        status: 404,
        message: 'Pokemon with id 1 was not found',
        errorId: 'e404',
      }),
    )
    const { wrapper, router } = await mountAt('/collection/1/edit')

    await regionInput(wrapper).setValue('Johto')
    await submit(wrapper)

    const removed = wrapper.get('[data-test="removed"]')
    expect(removed.text()).toContain('No longer in your collection')
    expect(removed.text()).toContain('e404')

    // Nothing left to save: leaving doesn't prompt.
    await router.push('/collection')
    expect(Dialog.create).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/collection')
  })

  it('keeps the form and allows retrying after a 503', async () => {
    updateMock
      .mockRejectedValueOnce(
        new ApiRequestError({
          status: 503,
          message: 'The service is temporarily unavailable. Please try again later.',
          errorId: 'b41d07c3',
        }),
      )
      .mockResolvedValueOnce({ ...bulbasaur, region: 'Johto' })
    const { wrapper, router } = await mountAt('/collection/1/edit')

    await regionInput(wrapper).setValue('Johto')
    await submit(wrapper)

    const summary = wrapper.get('[data-test="form-summary"]')
    expect(summary.text()).toContain('temporarily unavailable')
    expect(summary.text()).toContain('b41d07c3')

    await submit(wrapper)
    expect(updateMock).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.path).toBe('/collection/1')
  })

  it('asks before leaving with unsaved changes', async () => {
    answerDialog(false)
    const { wrapper, router } = await mountAt('/collection/1/edit')

    await regionInput(wrapper).setValue('Johto')
    await wrapper.get('button[data-test="cancel"]').trigger('click')
    await flushPromises()

    expect(Dialog.create).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/collection/1/edit')

    answerDialog(true)
    await wrapper.get('button[data-test="cancel"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/collection/1')
  })

  it('shows the not-in-collection state when loading returns 404', async () => {
    getMock.mockRejectedValue(
      new ApiRequestError({
        status: 404,
        message: 'Pokemon with id 150 was not found',
        errorId: 'x',
      }),
    )
    const { wrapper } = await mountAt('/collection/150/edit')

    expect(wrapper.get('[role="alert"]').text()).toContain('Not in your collection')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('rejects an invalid id without calling the API', async () => {
    const { wrapper } = await mountAt('/collection/abc/edit')

    expect(getMock).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('Invalid Pokédex number')
  })
})
