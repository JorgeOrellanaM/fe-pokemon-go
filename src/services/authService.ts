import { apiRequest } from '@/services/http'
import type { AccessTokenResponse, LoginRequest, RegisterRequest, UserResponse } from '@/types/auth'

/** Auth endpoints (`/auth`). See AUTH.md. */
export const authService = {
  /**
   * Creates an account; does NOT log the user in. Resolves to the normalized username.
   * `400` with `errors[]` per field, `409` when the username is taken.
   */
  register(request: RegisterRequest, signal?: AbortSignal): Promise<UserResponse> {
    // Only the two accepted fields: unknown fields are rejected with 400.
    const body: RegisterRequest = { username: request.username, password: request.password }
    return apiRequest<UserResponse>('/auth/register', { method: 'POST', body, signal, auth: false })
  },

  /** `401` "Invalid username or password." for wrong credentials. */
  login(request: LoginRequest, signal?: AbortSignal): Promise<AccessTokenResponse> {
    const body: LoginRequest = { username: request.username, password: request.password }
    return apiRequest<AccessTokenResponse>('/auth/login', {
      method: 'POST',
      body,
      signal,
      auth: false,
    })
  },

  /** The user the current token belongs to. `401` when the token is no longer valid. */
  me(signal?: AbortSignal): Promise<UserResponse> {
    return apiRequest<UserResponse>('/auth/me', { signal })
  },
}
