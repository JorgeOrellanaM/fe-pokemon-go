import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_STORAGE_KEY,
  clearStoredSession,
  isSessionExpired,
  readStoredSession,
  writeStoredSession,
} from '@/services/authSessionStorage'
import type { AuthSession } from '@/types/auth'

const NOW = Date.parse('2026-10-10T12:00:00Z')

const session: AuthSession = {
  accessToken: 'token',
  tokenType: 'Bearer',
  expiresAt: '2026-10-10T13:00:00Z',
  username: 'ash',
}

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('isSessionExpired', () => {
  it('compares expiresAt with now and treats unreadable dates as expired', () => {
    expect(isSessionExpired(session, NOW)).toBe(false)
    expect(isSessionExpired(session, Date.parse(session.expiresAt))).toBe(true)
    expect(isSessionExpired({ expiresAt: 'not a date' }, NOW)).toBe(true)
  })
})

describe('stored session', () => {
  it('round-trips through sessionStorage, never localStorage', () => {
    writeStoredSession(session)

    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.length).toBe(0)
    expect(readStoredSession(NOW)).toEqual(session)

    clearStoredSession()
    expect(readStoredSession(NOW)).toBeNull()
  })

  it('drops an expired session', () => {
    writeStoredSession(session)

    expect(readStoredSession(Date.parse('2026-10-10T13:00:01Z'))).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('drops malformed data', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{not json')
    expect(readStoredSession(NOW)).toBeNull()

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken: 'x' }))
    expect(readStoredSession(NOW)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('copes with unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(() => writeStoredSession(session)).not.toThrow()
    expect(readStoredSession(NOW)).toBeNull()
  })
})
