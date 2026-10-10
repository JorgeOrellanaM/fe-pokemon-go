// Login / register forms: client-side validation mirroring the backend rules (AUTH.md §2) for
// instant feedback. The server stays the source of truth: its `errors[]` are shown as well.
import type { FieldError } from '@/types/api'
import { mapFieldErrors, type MappedFieldErrors } from '@/utils/fieldErrors'

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30
export const PASSWORD_MIN_LENGTH = 8
/** The backend limit is in UTF-8 bytes (bcrypt), not characters. */
export const PASSWORD_MAX_BYTES = 72

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/

export type AuthField = 'username' | 'password'
export const AUTH_FIELDS: readonly AuthField[] = ['username', 'password']

/** What the backend stores: surrounding spaces removed, lowercase (`" Ash "` → `"ash"`). */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

/** Register rules for the username, checked on the normalized value. `null` when valid. */
export function validateUsername(username: string): string | null {
  const value = normalizeUsername(username)
  if (!value) return 'Enter a username.'
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return `Must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Use only letters, digits, '.', '_' and '-'."
  }
  return null
}

/** Register rules for the password (kept exactly as typed, spaces included). `null` when valid. */
export function validatePassword(password: string): string | null {
  if (!password) return 'Enter a password.'
  // A whitespace-only password is "blank" for the backend.
  if (!password.trim()) return "The password can't be only spaces."
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) {
    return `Too long: at most ${PASSWORD_MAX_BYTES} bytes (fewer characters with accents or emoji).`
  }
  return null
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) return 'Repeat the password.'
  return confirmation === password ? null : "The passwords don't match."
}

/** Login only checks that both fields are filled in (format rules are not checked there). */
export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `Enter your ${label}.`
}

export type MappedAuthErrors = MappedFieldErrors<AuthField>

/** Maps backend `errors[]` onto the username/password inputs. */
export function mapAuthFieldErrors(errors: readonly FieldError[]): MappedAuthErrors {
  return mapFieldErrors(errors, AUTH_FIELDS)
}

/**
 * Where to go after logging in: only same-app absolute paths are accepted, so a crafted
 * `?redirect=https://evil.example` (or `//evil.example`) can't send the user elsewhere.
 */
export function safeRedirect(value: unknown, fallback = '/'): string {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return fallback
  }
  return target
}
