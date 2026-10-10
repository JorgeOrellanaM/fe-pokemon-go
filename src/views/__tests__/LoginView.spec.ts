import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Notify, Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import { authService } from '@/services/authService'
import { ApiRequestError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

vi.mock('@/services/authService', () => ({
  authService: { login: vi.fn<typeof authService.login>() },
}))

const loginMock = vi.mocked(authService.login)
let wrapper: VueWrapper | undefined

async function mountAt(url: string) {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'pokemon-catalog', component: { template: '<div />' } },
      { path: '/collection/:id/edit', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: LoginView },
      { path: '/register', name: 'register', component: { template: '<div />' } },
    ],
  })
  await router.push(url)
  await router.isReady()
  wrapper = mount(LoginView, {
    global: {
      plugins: [Quasar, pinia, router],
      stubs: { QPage: { template: '<main><slot /></main>' } },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, router, auth: useAuthStore(pinia) }
}

const input = (w: VueWrapper, test: string) => w.get(`input[data-test="${test}"]`)

async function logIn(w: VueWrapper, username: string, password: string) {
  await input(w, 'username-input').setValue(username)
  await input(w, 'password-input').setValue(password)
  await w.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  loginMock.mockReset()
  vi.mocked(Notify.create).mockClear()
})

afterEach(() => {
  wrapper?.unmount()
  sessionStorage.clear()
})

describe('LoginView', () => {
  it('logs in and returns to the page the user came from', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'abc',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    })
    const { wrapper: w, router, auth } = await mountAt('/login?redirect=/collection/25/edit')

    expect(w.find('[data-test="redirect-banner"]').exists()).toBe(true)
    await logIn(w, 'Demo', 'Pokemon123!')

    expect(loginMock).toHaveBeenCalledWith({ username: 'demo', password: 'Pokemon123!' })
    expect(auth.username).toBe('demo')
    expect(router.currentRoute.value.fullPath).toBe('/collection/25/edit')
    expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'positive' }))
  })

  it('stays on the form and shows the message for wrong credentials (401)', async () => {
    loginMock.mockRejectedValue(
      new ApiRequestError({ status: 401, message: 'Invalid username or password.' }),
    )
    const { wrapper: w, router, auth } = await mountAt('/login')

    await logIn(w, 'demo', 'wrong-password')

    expect(router.currentRoute.value.name).toBe('login')
    expect(auth.isAuthenticated).toBe(false)
    expect(w.get('[data-test="form-summary"]').text()).toContain('Invalid username or password.')
    // The typed values are kept; focus goes to the password to try again.
    expect((input(w, 'username-input').element as HTMLInputElement).value).toBe('demo')
    expect(document.activeElement).toBe(input(w, 'password-input').element)
  })

  it('requires both fields', async () => {
    const { wrapper: w } = await mountAt('/login')

    await w.get('form').trigger('submit')
    await flushPromises()

    expect(loginMock).not.toHaveBeenCalled()
    expect(w.text()).toContain('Enter your username.')
    expect(w.text()).toContain('Enter your password.')
  })

  it('confirms a new account and prefills its username', async () => {
    const { wrapper: w } = await mountAt('/login?registered=ash')

    expect(w.get('[data-test="registered-banner"]').text()).toContain('ash')
    expect((input(w, 'username-input').element as HTMLInputElement).value).toBe('ash')
    expect(document.activeElement).toBe(input(w, 'password-input').element)
  })

  it('fills in the demo account', async () => {
    const { wrapper: w } = await mountAt('/login')

    await w.get('button[data-test="use-demo"]').trigger('click')

    expect((input(w, 'username-input').element as HTMLInputElement).value).toBe('demo')
    expect((input(w, 'password-input').element as HTMLInputElement).value).toBe('Pokemon123!')
  })
})
