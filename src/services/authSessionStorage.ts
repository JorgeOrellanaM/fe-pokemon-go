import type { AuthSession } from '@/types/auth'

/**
 * Persists the auth session in `sessionStorage` (cleared when the tab closes; never
 * `localStorage`) so a reload keeps the user logged in. Storage can be unavailable (private
 * mode, blocked site data): every access is guarded and the app then keeps the session in
 * memory only.
 */
export const SESSION_STORAGE_KEY = 'pokemon-go.auth'

/** Milliseconds since epoch at which the session expires, or `NaN` when unparseable. */
export function sessionExpiry(session: Pick<AuthSession, 'expiresAt'>): number {
  return Date.parse(session.expiresAt)
}

/** True once `expiresAt` has passed (or can't be read): such a token must never be sent. */
export function isSessionExpired(
  session: Pick<AuthSession, 'expiresAt'>,
  now: number = Date.now(),
): boolean {
  const expiry = sessionExpiry(session)
  return Number.isNaN(expiry) || expiry <= now
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.accessToken === 'string' &&
    record.accessToken.length > 0 &&
    record.tokenType === 'Bearer' &&
    typeof record.expiresAt === 'string' &&
    typeof record.username === 'string'
  )
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing was stored.
  }
}

/** The stored session, or `null` when missing, malformed or expired (which is then removed). */
export function readStoredSession(now: number = Date.now()): AuthSession | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = null
  }
  if (!isAuthSession(parsed) || isSessionExpired(parsed, now)) {
    clearStoredSession()
    return null
  }
  return parsed
}

export function writeStoredSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage unavailable or full: the session lives in memory until the page is reloaded.
  }
}
