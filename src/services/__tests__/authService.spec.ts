import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '@/services/authService'
import { ApiRequestError, setAuthHandlers, type AuthHandlers } from '@/services/http'

const fetchMock = vi.fn<typeof fetch>()
const onUnauthorized = vi.fn<AuthHandlers['onUnauthorized']>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, message: string, errors?: unknown[]): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        status,
        error: 'Error',
        message,
        path: '/api/v1/auth',
        timestamp: '2026-10-10T11:46:04.993Z',
        errorId: 'fc18f326',
        ...(errors ? { errors } : {}),
      },
    },
    status,
  )
}

const requestInit = () => fetchMock.mock.calls[0]?.[1]
const headers = () => requestInit()?.headers as Record<string, string>

beforeEach(() => {
  fetchMock.mockReset()
  onUnauthorized.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // A logged-in client: login/register must still go out without the token.
  setAuthHandlers({ getAuthorization: () => 'Bearer old-token', onUnauthorized })
})

afterEach(() => {
  setAuthHandlers(null)
  vi.unstubAllGlobals()
})

describe('authService.register', () => {
  it('posts only username and password, without a token, and returns the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { username: 'ash' } }, 201))

    const extra = { username: 'ash', password: 'Pikachu123!', role: 'ADMIN' }
    await expect(authService.register(extra)).resolves.toEqual({ username: 'ash' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/register')
    expect(requestInit()?.method).toBe('POST')
    expect(requestInit()?.body).toBe('{"username":"ash","password":"Pikachu123!"}')
    expect(headers().Authorization).toBeUndefined()
  })

  it('rejects with the field errors (400) and the conflict message (409)', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(400, 'Please check the highlighted fields.', [
        { field: 'username', message: 'must be between 3 and 30 characters' },
      ]),
    )
    const invalid = await authService.register({ username: 'a', password: 'x' }).catch((e) => e)
    expect(invalid).toBeInstanceOf(ApiRequestError)
    expect((invalid as ApiRequestError).fieldErrors).toEqual([
      { field: 'username', message: 'must be between 3 and 30 characters' },
    ])

    fetchMock.mockResolvedValueOnce(errorResponse(409, "The username 'ash' is already taken"))
    const taken = (await authService
      .register({ username: 'ash', password: 'Pikachu123!' })
      .catch((e) => e)) as ApiRequestError
    expect(taken.status).toBe(409)
    expect(taken.message).toBe("The username 'ash' is already taken")
  })
})

describe('authService.login', () => {
  it('returns the token', async () => {
    const token = { accessToken: 'abc', tokenType: 'Bearer', expiresAt: '2026-10-10T12:46:05Z' }
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: token }))

    await expect(authService.login({ username: 'demo', password: 'Pokemon123!' })).resolves.toEqual(
      token,
    )
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/login')
    expect(headers().Authorization).toBeUndefined()
  })

  it('treats a 401 as wrong credentials, not as an ended session', async () => {
    fetchMock.mockResolvedValue(errorResponse(401, 'Invalid username or password.'))

    const error = (await authService
      .login({ username: 'demo', password: 'nope' })
      .catch((e) => e)) as ApiRequestError

    expect(error.status).toBe(401)
    expect(error.message).toBe('Invalid username or password.')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe('authService.me', () => {
  it('sends the token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { username: 'demo' } }))

    await expect(authService.me()).resolves.toEqual({ username: 'demo' })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/me')
    expect(headers().Authorization).toBe('Bearer old-token')
  })

  it('reports a rejected token as unauthorized', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(401, 'Authentication is required to access this resource.'),
    )

    await expect(authService.me()).rejects.toBeInstanceOf(ApiRequestError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
