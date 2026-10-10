import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { Notify } from 'quasar'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { logInForTest } from '@/__tests__/authSession'
import { createAuthGuard, installSessionHandlers } from '@/router/auth'
import { ApiRequestError, apiGet, setAuthHandlers } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

const Empty = { template: '<div />' }
const fetchMock = vi.fn<typeof fetch>()

function makeRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'pokemon-catalog', component: Empty },
      { path: '/pokemon/:id', name: 'pokemon-details', component: Empty },
      { path: '/collection/:id/edit', component: Empty, meta: { requiresAuth: true } },
      { path: '/login', name: 'login', component: Empty, meta: { guestOnly: true } },
      { path: '/register', name: 'register', component: Empty, meta: { guestOnly: true } },
    ],
  })
  router.beforeEach(createAuthGuard(router))
  return router
}

function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        status: 401,
        error: 'Unauthorized',
        message: 'Authentication is required to access this resource.',
        path: '/api/v1/local-pokemon/25',
        timestamp: '2026-10-10T11:46:04.217Z',
        errorId: 'c472d152',
      },
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
}

const pinia = () => {
  const instance = createPinia()
  setActivePinia(instance)
  return instance
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(Notify.create).mockClear()
})

afterEach(() => {
  setAuthHandlers(null)
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('auth guard', () => {
  it('sends logged-out users from protected pages to the login page, remembering the page', async () => {
    pinia()
    const router = makeRouter()

    await router.push('/collection/25/edit?page=2')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/collection/25/edit?page=2')
  })

  it('lets everyone browse public pages', async () => {
    pinia()
    const router = makeRouter()

    await router.push('/pokemon/25')

    expect(router.currentRoute.value.fullPath).toBe('/pokemon/25')
  })

  it('lets logged-in users open protected pages', async () => {
    await logInForTest(pinia())
    const router = makeRouter()

    await router.push('/collection/25/edit')

    expect(router.currentRoute.value.fullPath).toBe('/collection/25/edit')
  })

  it('sends logged-in users away from login/register, to a safe redirect', async () => {
    await logInForTest(pinia())
    const router = makeRouter()

    await router.push('/login?redirect=/pokemon/25')
    expect(router.currentRoute.value.fullPath).toBe('/pokemon/25')

    await router.push('/register')
    expect(router.currentRoute.value.fullPath).toBe('/')

    await router.push('/login?redirect=https://evil.example')
    expect(router.currentRoute.value.fullPath).toBe('/')

    await router.push('/login?redirect=/register')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })
})

describe('session handlers', () => {
  async function setup({ loggedIn }: { loggedIn: boolean }) {
    const instance = pinia()
    if (loggedIn) await logInForTest(instance)
    const router = makeRouter()
    installSessionHandlers(router)
    await router.push('/pokemon/25?page=2')
    return { router, auth: useAuthStore() }
  }

  it('attaches the token to API calls', async () => {
    await setup({ loggedIn: true })
    fetchMock.mockResolvedValue(new Response('{"success":true,"data":{}}'))

    await apiGet('/pokemon/25')

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer test-token',
    })
  })

  it('on a 401, forgets the token and goes to the login page, set to come back', async () => {
    const { router, auth } = await setup({ loggedIn: true })
    fetchMock.mockResolvedValue(unauthorizedResponse())

    await expect(apiGet('/local-pokemon')).rejects.toBeInstanceOf(ApiRequestError)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))

    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.query.redirect).toBe('/pokemon/25?page=2')
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Your session has expired. Please log in again.' }),
    )
  })

  it('goes to the login page when the token expires', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { router } = await setup({ loggedIn: true })

      vi.advanceTimersByTime(60 * 60 * 1000)

      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not redirect on logout', async () => {
    const { router, auth } = await setup({ loggedIn: true })

    auth.logout()
    await Promise.resolve()

    expect(router.currentRoute.value.fullPath).toBe('/pokemon/25?page=2')
    expect(Notify.create).not.toHaveBeenCalled()
  })
})
