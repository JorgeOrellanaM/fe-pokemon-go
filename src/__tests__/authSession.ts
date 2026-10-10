// Test helper (not a spec): starts a session through the real auth store.
import { vi } from 'vitest'
import type { Pinia } from 'pinia'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth'

/** Logs `username` in on `pinia`'s auth store with a token valid for an hour. */
export async function logInForTest(pinia: Pinia, username = 'ash'): Promise<void> {
  const spy = vi.spyOn(authService, 'login').mockResolvedValueOnce({
    accessToken: 'test-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  })
  await useAuthStore(pinia).login({ username, password: 'Pikachu123!' })
  spy.mockRestore()
}
