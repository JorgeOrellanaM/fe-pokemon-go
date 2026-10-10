import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/authService'
import {
  clearStoredSession,
  isSessionExpired,
  readStoredSession,
  sessionExpiry,
  writeStoredSession,
} from '@/services/authSessionStorage'
import type { AuthSession, LoginRequest, RegisterRequest, UserResponse } from '@/types/auth'
import { normalizeUsername } from '@/utils/authForm'

/** Why the last session ended: the user logged out, or the token expired / was rejected (401). */
export type SessionEndReason = 'logout' | 'expired'

/** `setTimeout` can't wait longer than ~24.8 days; longer delays are re-armed when they fire. */
const MAX_TIMER_DELAY = 2_147_483_647

/**
 * The logged-in user and their access token. The token is kept in memory and mirrored to
 * `sessionStorage` (never `localStorage`) so a reload doesn't log the user out. An expired
 * token is dropped as soon as it is noticed (timer, guard or before a request) and is never
 * sent: the backend answers 401 even on public routes when it receives a bad token.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = shallowRef<AuthSession | null>(null)
  const endReason = ref<SessionEndReason | null>(null)
  /** True while the stored session is being checked with `GET /auth/me` after a reload. */
  const restoring = ref(false)

  const isAuthenticated = computed(() => session.value !== null)
  const username = computed(() => session.value?.username ?? null)
  const expiresAt = computed(() => session.value?.expiresAt ?? null)

  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  let restorePromise: Promise<void> | null = null

  function clearExpiryTimer() {
    if (expiryTimer !== null) clearTimeout(expiryTimer)
    expiryTimer = null
  }

  function scheduleExpiry(current: AuthSession) {
    clearExpiryTimer()
    const delay = sessionExpiry(current) - Date.now()
    expiryTimer = setTimeout(
      () => {
        expiryTimer = null
        if (session.value !== current) return
        if (isSessionExpired(current)) endSession('expired')
        else scheduleExpiry(current) // the delay was clamped
      },
      Math.min(Math.max(delay, 0), MAX_TIMER_DELAY),
    )
  }

  function startSession(next: AuthSession) {
    session.value = next
    endReason.value = null
    writeStoredSession(next)
    scheduleExpiry(next)
  }

  /** Forgets the token (there is no logout endpoint). No-op when already logged out. */
  function endSession(reason: SessionEndReason) {
    if (!session.value) return
    clearExpiryTimer()
    clearStoredSession()
    // Reason first: watchers of `isAuthenticated` may run synchronously and read it.
    endReason.value = reason
    session.value = null
  }

  /** True while there is a session whose token has not expired; ends an expired one. */
  function hasValidSession(): boolean {
    const current = session.value
    if (!current) return false
    if (isSessionExpired(current)) {
      endSession('expired')
      return false
    }
    return true
  }

  /** `Authorization` header value for the HTTP client, or `null` (never an expired token). */
  function authorizationHeader(): string | null {
    if (!hasValidSession() || !session.value) return null
    return `${session.value.tokenType} ${session.value.accessToken}`
  }

  /** Throws `ApiRequestError` (401 "Invalid username or password.", 400…) on failure. */
  async function login(credentials: LoginRequest): Promise<AuthSession> {
    const user = normalizeUsername(credentials.username)
    const token = await authService.login({ username: user, password: credentials.password })
    const next: AuthSession = {
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      expiresAt: token.expiresAt,
      username: user,
    }
    startSession(next)
    return next
  }

  /** Creates the account without logging in. Resolves to the normalized username. */
  function register(credentials: RegisterRequest): Promise<UserResponse> {
    return authService.register({
      username: normalizeUsername(credentials.username),
      password: credentials.password,
    })
  }

  function logout() {
    endSession('logout')
  }

  /** A 401 outside login: the token is no longer accepted. */
  function handleUnauthorized() {
    endSession('expired')
  }

  async function verifyStoredSession() {
    const stored = readStoredSession()
    if (!stored) return
    startSession(stored)
    restoring.value = true
    try {
      const user = await authService.me()
      // Keep the server's spelling of the username (it is the normalized one).
      if (session.value === stored && user.username !== stored.username) {
        startSession({ ...stored, username: user.username })
      }
    } catch {
      // 401: the HTTP client already ended the session (see `handleUnauthorized`).
      // 403, 5xx or network errors: keep the token, it may still be valid.
    } finally {
      restoring.value = false
    }
  }

  /** Restores the session saved before a reload. Runs once; later calls share the result. */
  function restore(): Promise<void> {
    restorePromise ??= verifyStoredSession()
    return restorePromise
  }

  // The token itself is not exposed: only the HTTP client reads it, via `authorizationHeader`.
  return {
    endReason,
    restoring,
    isAuthenticated,
    username,
    expiresAt,
    hasValidSession,
    authorizationHeader,
    login,
    register,
    logout,
    handleUnauthorized,
    restore,
  }
})
