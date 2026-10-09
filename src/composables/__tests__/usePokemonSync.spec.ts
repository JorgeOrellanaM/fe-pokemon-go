import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Notify, Quasar, type QNotifyCreateOptions } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import { usePokemonSync } from '@/composables/usePokemonSync'
import { ApiRequestError } from '@/services/http'
import { localPokemonService } from '@/services/localPokemonService'
import type { LocalPokemon } from '@/types/pokemon'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

vi.mock('@/services/localPokemonService', () => ({
  localPokemonService: { sync: vi.fn<typeof localPokemonService.sync>() },
}))

const syncMock = vi.mocked(localPokemonService.sync)

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/collection/:id', name: 'local-pokemon', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  let api!: ReturnType<typeof usePokemonSync>
  const Host = defineComponent({
    setup() {
      api = usePokemonSync()
      return () => null
    },
  })
  mount(Host, { global: { plugins: [Quasar, createPinia(), router] } })
  return { api, router }
}

function lastNotification(): QNotifyCreateOptions {
  return vi.mocked(Notify.create).mock.lastCall?.[0] as QNotifyCreateOptions
}

beforeEach(() => {
  syncMock.mockReset()
  vi.mocked(Notify.create).mockClear()
})

describe('usePokemonSync', () => {
  it('confirms a new sync with a link to the local entry (201)', async () => {
    syncMock.mockResolvedValue({ id: 122 } as LocalPokemon)
    const { api, router } = await setup()

    const result = await api.sync(122, 'mr-mime')

    expect(result.status).toBe('created')
    expect(api.isSynced(122)).toBe(true)
    const notification = lastNotification()
    expect(notification.type).toBe('positive')
    expect(notification.message).toBe('Mr. Mime was added to your collection.')

    const view = notification.actions?.[0] as { label: string; handler: () => void }
    expect(view.label).toBe('View')
    view.handler()
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/collection/122'))
  })

  it('reports an already synced Pokémon as information (409)', async () => {
    syncMock.mockRejectedValue(new ApiRequestError({ status: 409, message: 'already synced' }))
    const { api } = await setup()

    await api.sync(6, 'charizard')

    expect(lastNotification()).toMatchObject({
      type: 'info',
      message: 'Charizard is already in your collection.',
    })
    expect(api.isSynced(6)).toBe(true)
  })

  it('shows the error with its id and a retry action (503)', async () => {
    syncMock.mockRejectedValueOnce(
      new ApiRequestError({
        status: 503,
        message: 'The service is temporarily unavailable. Please try again later.',
        errorId: 'b41d07c3',
      }),
    )
    const { api } = await setup()

    await api.sync(10, 'caterpie')

    const notification = lastNotification()
    expect(notification.type).toBe('negative')
    expect(notification.message).toBe(
      "Couldn't add Caterpie: The service is temporarily unavailable. Please try again later.",
    )
    expect(notification.caption).toBe('Error ID: b41d07c3')
    expect(api.isSynced(10)).toBe(false)

    syncMock.mockResolvedValueOnce({ id: 10 } as LocalPokemon)
    const retry = notification.actions?.[0] as { label: string; handler: () => void }
    expect(retry.label).toBe('Retry')
    retry.handler()
    await vi.waitFor(() => expect(api.isSynced(10)).toBe(true))
  })

  it('does not offer a retry for a 404', async () => {
    syncMock.mockRejectedValue(
      new ApiRequestError({ status: 404, message: 'Pokemon with id 99999 was not found' }),
    )
    const { api } = await setup()

    await api.sync(99999)

    const notification = lastNotification()
    expect(notification.message).toBe(
      "Couldn't add Pokémon #99999: Pokemon with id 99999 was not found",
    )
    expect(notification.caption).toBeUndefined()
    expect(notification.actions?.[0]).toMatchObject({ 'aria-label': 'Dismiss' })
  })
})
