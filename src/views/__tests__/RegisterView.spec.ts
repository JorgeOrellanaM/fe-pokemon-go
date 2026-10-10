import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Notify, Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import RegisterView from '@/views/RegisterView.vue'
import { authService } from '@/services/authService'
import { ApiRequestError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

// Notify only gets its API once the plugin is installed: replace it with a spy.
vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Notify: { create: vi.fn<(typeof import('quasar'))['Notify']['create']>() },
}))

vi.mock('@/services/authService', () => ({
  authService: { register: vi.fn<typeof authService.register>() },
}))

const registerMock = vi.mocked(authService.register)
let wrapper: VueWrapper | undefined

async function mountAt(url: string) {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/register', name: 'register', component: RegisterView },
    ],
  })
  await router.push(url)
  await router.isReady()
  wrapper = mount(RegisterView, {
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

async function register(w: VueWrapper, username: string, password: string) {
  await input(w, 'username-input').setValue(username)
  await input(w, 'password-input').setValue(password)
  await input(w, 'confirmation-input').setValue(password)
  await w.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  registerMock.mockReset()
  vi.mocked(Notify.create).mockClear()
})

afterEach(() => wrapper?.unmount())

describe('RegisterView', () => {
  it('creates the account and sends the user to log in, without logging in', async () => {
    registerMock.mockResolvedValue({ username: 'ash' })
    const { wrapper: w, router, auth } = await mountAt('/register?redirect=/pokemon/25')

    await register(w, ' Ash ', 'Pikachu123!')

    expect(registerMock).toHaveBeenCalledWith({ username: 'ash', password: 'Pikachu123!' })
    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ registered: 'ash', redirect: '/pokemon/25' })
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Account created. Your username is “ash”.' }),
    )
  })

  it('stays on the form when the username is taken (409)', async () => {
    registerMock.mockRejectedValue(
      new ApiRequestError({ status: 409, message: "The username 'ash' is already taken" }),
    )
    const { wrapper: w, router } = await mountAt('/register')

    await register(w, 'ash', 'Pikachu123!')

    expect(router.currentRoute.value.name).toBe('register')
    expect(w.text()).toContain("The username 'ash' is already taken.")
  })
})
