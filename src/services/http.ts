import type { ApiError, ApiResponse, FieldError } from '@/types/api'

/** Base URL of the backend REST API (proxied to the backend by Vite in development). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Please check your connection and try again.'
export const UNEXPECTED_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.'
export const UNAVAILABLE_ERROR_MESSAGE =
  'The service is temporarily unavailable. Please try again later.'

/**
 * Error raised by the HTTP client for every failed call. `message` is always user-friendly,
 * so the UI can display it as-is.
 */
export class ApiRequestError extends Error {
  /** HTTP status, or `0` when the server could not be reached. */
  readonly status: number
  /** Backend log correlation id, when the backend produced the error. */
  readonly errorId: string | null
  readonly fieldErrors: FieldError[]

  constructor(options: {
    status: number
    message: string
    errorId?: string | null
    fieldErrors?: FieldError[]
  }) {
    super(options.message)
    this.name = 'ApiRequestError'
    this.status = options.status
    this.errorId = options.errorId ?? null
    this.fieldErrors = options.fieldErrors ?? []
  }

  /** Transient failures (network, 5xx) are worth retrying; client errors are not. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500
  }

  static fromApiError(error: ApiError): ApiRequestError {
    return new ApiRequestError({
      status: error.status,
      message: error.message || UNEXPECTED_ERROR_MESSAGE,
      errorId: error.errorId,
      fieldErrors: error.errors,
    })
  }
}

/** Normalizes anything thrown during a request into an {@link ApiRequestError}. */
export function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error
  // A client-side fault (e.g. a bug while handling the response): treat it as unexpected.
  return new ApiRequestError({ status: 500, message: UNEXPECTED_ERROR_MESSAGE })
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

export function buildUrl(path: string, query?: QueryParams): string {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const url = `${base}/${path.replace(/^\/+/, '')}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.append(key, String(value))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isEnvelope(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Message for failures that did not come with a backend envelope (e.g. proxy errors). */
function fallbackMessage(status: number): string {
  return status === 502 || status === 503 || status === 504
    ? UNAVAILABLE_ERROR_MESSAGE
    : UNEXPECTED_ERROR_MESSAGE
}

/**
 * Calls the backend, unwraps the `{ success, data }` envelope and returns `data`.
 * Throws {@link ApiRequestError} on any failure; re-throws `AbortError` untouched so callers
 * can ignore cancelled requests.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiRequestError({ status: 0, message: NETWORK_ERROR_MESSAGE })
  }

  const payload = await readJson(response)

  if (isEnvelope(payload)) {
    if (payload.success) return payload.data as T
    if (payload.error) throw ApiRequestError.fromApiError(payload.error)
  }

  if (!response.ok) {
    throw new ApiRequestError({
      status: response.status,
      message: fallbackMessage(response.status),
    })
  }
  throw new ApiRequestError({ status: response.status, message: UNEXPECTED_ERROR_MESSAGE })
}

export function apiGet<T>(path: string, query?: QueryParams, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { query, signal })
}
