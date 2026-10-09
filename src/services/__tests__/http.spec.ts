import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiRequestError,
  NETWORK_ERROR_MESSAGE,
  UNAVAILABLE_ERROR_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
  apiGet,
  apiRequest,
  buildUrl,
  toApiRequestError,
} from '@/services/http'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildUrl', () => {
  it('prefixes the API base URL and skips empty params', () => {
    expect(buildUrl('/pokemon', { page: 0, size: 20, q: undefined, r: null })).toBe(
      '/api/v1/pokemon?page=0&size=20',
    )
    expect(buildUrl('pokemon/25')).toBe('/api/v1/pokemon/25')
  })
})

describe('apiRequest', () => {
  it('unwraps the success envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 25 } }))

    await expect(apiGet('/pokemon/25')).resolves.toEqual({ id: 25 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/pokemon/25',
      expect.objectContaining({ method: 'GET', headers: { Accept: 'application/json' } }),
    )
  })

  it('serializes a JSON body with the right content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: {} }))

    await apiRequest('/local-pokemon/25', { method: 'PUT', body: { region: 'Kanto' } })

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.body).toBe('{"region":"Kanto"}')
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
  })

  it('maps the error envelope to an ApiRequestError with message and errorId', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: {
            status: 400,
            error: 'Bad Request',
            message: 'size must be between 1 and 50',
            path: '/api/v1/pokemon',
            timestamp: '2026-10-09T14:32:10.123Z',
            errorId: '6f1c2a9e',
            errors: [{ field: 'size', message: 'must be between 1 and 50' }],
          },
        },
        400,
      ),
    )

    const error = await captureError(apiGet('/pokemon'))

    expect(error).toBeInstanceOf(ApiRequestError)
    const apiError = error as ApiRequestError
    expect(apiError.status).toBe(400)
    expect(apiError.message).toBe('size must be between 1 and 50')
    expect(apiError.errorId).toBe('6f1c2a9e')
    expect(apiError.fieldErrors).toEqual([{ field: 'size', message: 'must be between 1 and 50' }])
    expect(apiError.retryable).toBe(false)
  })

  it('marks 503 errors as retryable', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: {
            status: 503,
            error: 'Service Unavailable',
            message: UNAVAILABLE_ERROR_MESSAGE,
            path: '/api/v1/pokemon',
            timestamp: '2026-10-09T14:32:10.123Z',
            errorId: 'abcd1234',
          },
        },
        503,
      ),
    )

    const error = (await captureError(apiGet('/pokemon'))) as ApiRequestError
    expect(error.retryable).toBe(true)
    expect(error.fieldErrors).toEqual([])
  })

  it('reports network failures with a friendly message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = (await captureError(apiGet('/pokemon'))) as ApiRequestError
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error.status).toBe(0)
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE)
    expect(error.errorId).toBeNull()
    expect(error.retryable).toBe(true)
  })

  it('handles non-JSON error responses (e.g. proxy errors)', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }))

    const error = (await captureError(apiGet('/pokemon'))) as ApiRequestError
    expect(error.status).toBe(502)
    expect(error.message).toBe(UNAVAILABLE_ERROR_MESSAGE)
    expect(error.retryable).toBe(true)
  })

  it('rejects a successful response without an envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }))

    const error = (await captureError(apiGet('/pokemon'))) as ApiRequestError
    expect(error.message).toBe(UNEXPECTED_ERROR_MESSAGE)
  })

  it('re-throws aborts untouched', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValue(abort)

    await expect(apiGet('/pokemon')).rejects.toBe(abort)
  })
})

describe('toApiRequestError', () => {
  it('keeps ApiRequestError instances and wraps anything else', () => {
    const original = new ApiRequestError({ status: 404, message: 'Not found' })
    expect(toApiRequestError(original)).toBe(original)

    const wrapped = toApiRequestError(new Error('boom'))
    expect(wrapped.message).toBe(UNEXPECTED_ERROR_MESSAGE)
    expect(wrapped.message).not.toContain('boom')
  })
})
