import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authService } from '@/services/authService'
import { SESSION_STORAGE_KEY } from '@/services/authSessionStorage'
import { ApiRequestError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import type { AuthSession } from '@/types/auth'

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn<typeof authService.login>(),
    register: vi.fn<typeof authService.register>(),
    me: vi.fn<typeof authService.me>(),
  },
}))

const loginMock = vi.mocked(authService.login)
const registerMock = vi.mocked(authService.register)
const meMock = vi.mocked(authService.me)

const NOW = Date.parse('2026-10-10T12:00:00Z')
const IN_ONE_HOUR = '2026-10-10T13:00:00.000Z'

function stored(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
  return raw ? (JSON.parse(raw) as AuthSession) : null
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW })
  setActivePinia(createPinia())
  loginMock.mockReset()
  registerMock.mockReset()
  meMock.mockReset()
  loginMock.mockResolvedValue({ accessToken: 'abc', tokenType: 'Bearer', expiresAt: IN_ONE_HOUR })
})

afterEach(() => {
  vi.useRealTimers()
  sessionStorage.clear()
})

describe('auth store', () => {
  it('starts logged out', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.username).toBeNull()
    expect(auth.authorizationHeader()).toBeNull()
  })

  it('logs in with the normalized username and keeps the token in sessionStorage', async () => {
    const auth = useAuthStore()

    await auth.login({ username: '  Demo ', password: 'Pokemon123!' })

    expect(loginMock).toHaveBeenCalledWith({ username: 'demo', password: 'Pokemon123!' })
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.username).toBe('demo')
    expect(auth.expiresAt).toBe(IN_ONE_HOUR)
    expect(auth.authorizationHeader()).toBe('Bearer abc')
    expect(stored()).toMatchObject({ accessToken: 'abc', username: 'demo' })
    expect(localStorage.length).toBe(0)
  })

  it('stays logged out when the login fails', async () => {
    loginMock.mockRejectedValue(
      new ApiRequestError({ status: 401, message: 'Invalid username or password.' }),
    )
    const auth = useAuthStore()

    await expect(auth.login({ username: 'demo', password: 'x' })).rejects.toMatchObject({
      status: 401,
    })
    expect(auth.isAuthenticated).toBe(false)
    expect(stored()).toBeNull()
  })

  it('registers without logging in', async () => {
    registerMock.mockResolvedValue({ username: 'ash' })
    const auth = useAuthStore()

    await expect(auth.register({ username: ' Ash ', password: 'Pikachu123!' })).resolves.toEqual({
      username: 'ash',
    })
    expect(registerMock).toHaveBeenCalledWith({ username: 'ash', password: 'Pikachu123!' })
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logs out by forgetting the token', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'demo', password: 'Pokemon123!' })

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.endReason).toBe('logout')
    expect(auth.authorizationHeader()).toBeNull()
    expect(stored()).toBeNull()
  })

  it('ends the session on a 401 outside login', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'demo', password: 'Pokemon123!' })

    auth.handleUnauthorized()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.endReason).toBe('expired')
    expect(stored()).toBeNull()
  })

  describe('expiry', () => {
    it('ends the session when expiresAt passes', async () => {
      const auth = useAuthStore()
      await auth.login({ username: 'demo', password: 'Pokemon123!' })

      vi.advanceTimersByTime(60 * 60 * 1000 - 1)
      expect(auth.isAuthenticated).toBe(true)

      vi.advanceTimersByTime(1)
      expect(auth.isAuthenticated).toBe(false)
      expect(auth.endReason).toBe('expired')
      expect(stored()).toBeNull()
    })

    it('never hands out an expired token, even if the timer is late', async () => {
      const auth = useAuthStore()
      await auth.login({ username: 'demo', password: 'Pokemon123!' })

      // The clock moves on without the timer firing (e.g. a sleeping tab).
      vi.setSystemTime(Date.parse(IN_ONE_HOUR) + 1000)

      expect(auth.authorizationHeader()).toBeNull()
      expect(auth.isAuthenticated).toBe(false)
    })
  })

  describe('restore', () => {
    function storeSession(session: Partial<AuthSession> = {}) {
      const value: AuthSession = {
        accessToken: 'abc',
        tokenType: 'Bearer',
        expiresAt: IN_ONE_HOUR,
        username: 'demo',
        ...session,
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value))
    }

    it('does nothing without a stored session', async () => {
      const auth = useAuthStore()
      await auth.restore()
      expect(meMock).not.toHaveBeenCalled()
      expect(auth.isAuthenticated).toBe(false)
    })

    it('restores a stored session confirmed by /auth/me (once)', async () => {
      storeSession({ username: 'Demo' })
      meMock.mockResolvedValue({ username: 'demo' })
      const auth = useAuthStore()

      await Promise.all([auth.restore(), auth.restore()])

      expect(meMock).toHaveBeenCalledOnce()
      expect(auth.isAuthenticated).toBe(true)
      expect(auth.username).toBe('demo')
      expect(auth.restoring).toBe(false)
    })

    it('drops an expired stored session without calling the API', async () => {
      storeSession({ expiresAt: '2026-10-10T11:59:59Z' })
      const auth = useAuthStore()

      await auth.restore()

      expect(meMock).not.toHaveBeenCalled()
      expect(auth.isAuthenticated).toBe(false)
      expect(stored()).toBeNull()
    })

    it('ends the session when the token is rejected (401)', async () => {
      storeSession()
      const auth = useAuthStore()
      // The HTTP client reports a 401 to the store before rejecting.
      meMock.mockImplementation(() => {
        expect(auth.restoring).toBe(true)
        auth.handleUnauthorized()
        return Promise.reject(new ApiRequestError({ status: 401, message: 'Authentication…' }))
      })

      await auth.restore()

      expect(auth.isAuthenticated).toBe(false)
      expect(stored()).toBeNull()
    })

    it('keeps the session on network or server errors', async () => {
      storeSession()
      meMock.mockRejectedValue(new ApiRequestError({ status: 0, message: 'offline' }))
      const auth = useAuthStore()

      await auth.restore()

      expect(auth.isAuthenticated).toBe(true)
      expect(auth.username).toBe('demo')
    })
  })
})
