import { describe, expect, it } from 'vitest'
import {
  mapAuthFieldErrors,
  normalizeUsername,
  safeRedirect,
  utf8ByteLength,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
  validateUsername,
} from '@/utils/authForm'

describe('normalizeUsername', () => {
  it('trims and lowercases like the backend', () => {
    expect(normalizeUsername('  Ash ')).toBe('ash')
    expect(normalizeUsername('Mr.Mime_01')).toBe('mr.mime_01')
  })
})

describe('validateUsername', () => {
  it('accepts 3–30 letters, digits, ".", "_" and "-" (after normalizing)', () => {
    expect(validateUsername('ash')).toBeNull()
    expect(validateUsername('  Ash.Ketchum_-1  ')).toBeNull()
    expect(validateUsername('a'.repeat(30))).toBeNull()
  })

  it('requires a value', () => {
    expect(validateUsername('')).toBe('Enter a username.')
    expect(validateUsername('   ')).toBe('Enter a username.')
  })

  it('checks the length on the trimmed value', () => {
    expect(validateUsername(' ab ')).toBe('Must be between 3 and 30 characters.')
    expect(validateUsername('a'.repeat(31))).toBe('Must be between 3 and 30 characters.')
  })

  it('rejects other characters', () => {
    const message = "Use only letters, digits, '.', '_' and '-'."
    expect(validateUsername('ash ketchum')).toBe(message)
    expect(validateUsername('ash@kanto')).toBe(message)
    expect(validateUsername('pokémon')).toBe(message)
  })
})

describe('validatePassword', () => {
  it('accepts 8+ characters, kept as typed (spaces included)', () => {
    expect(validatePassword('Pikachu123!')).toBeNull()
    expect(validatePassword(' 1234567')).toBeNull()
  })

  it('requires a non-blank value', () => {
    expect(validatePassword('')).toBe('Enter a password.')
    expect(validatePassword('         ')).toBe("The password can't be only spaces.")
  })

  it('requires at least 8 characters', () => {
    expect(validatePassword('1234567')).toBe('Must be at least 8 characters.')
  })

  it('limits the password to 72 UTF-8 bytes, not characters', () => {
    expect(validatePassword('a'.repeat(72))).toBeNull()
    expect(validatePassword('a'.repeat(73))).toMatch(/at most 72 bytes/)
    // 36 × "é" = 72 bytes is fine; 37 is 74 bytes although only 37 characters.
    expect(validatePassword('é'.repeat(36))).toBeNull()
    expect(validatePassword('é'.repeat(37))).toMatch(/at most 72 bytes/)
  })
})

describe('utf8ByteLength', () => {
  it('counts bytes', () => {
    expect(utf8ByteLength('abc')).toBe(3)
    expect(utf8ByteLength('é')).toBe(2)
    expect(utf8ByteLength('🔥')).toBe(4)
  })
})

describe('validatePasswordConfirmation', () => {
  it('requires the same password', () => {
    expect(validatePasswordConfirmation('Pikachu123!', '')).toBe('Repeat the password.')
    expect(validatePasswordConfirmation('Pikachu123!', 'pikachu123!')).toBe(
      "The passwords don't match.",
    )
    expect(validatePasswordConfirmation('Pikachu123!', 'Pikachu123!')).toBeNull()
  })
})

describe('validateRequired', () => {
  it('only checks that the field is filled in', () => {
    expect(validateRequired('', 'username')).toBe('Enter your username.')
    expect(validateRequired('  ', 'username')).toBe('Enter your username.')
    expect(validateRequired('x', 'username')).toBeNull()
  })
})

describe('mapAuthFieldErrors', () => {
  it('maps username/password errors onto the inputs and keeps unknown fields apart', () => {
    expect(
      mapAuthFieldErrors([
        { field: 'username', message: 'must be between 3 and 30 characters' },
        { field: 'password', message: 'must not be blank' },
        { field: 'role', message: 'is not a recognized field' },
      ]),
    ).toEqual({
      fields: {
        username: ['Must be between 3 and 30 characters.'],
        password: ['Must not be blank.'],
      },
      other: ['role: is not a recognized field'],
    })
  })
})

describe('safeRedirect', () => {
  it('keeps paths of this app', () => {
    expect(safeRedirect('/collection/25/edit?page=2')).toBe('/collection/25/edit?page=2')
    expect(safeRedirect(['/pokemon/25', '/x'])).toBe('/pokemon/25')
  })

  it('falls back for missing, external or protocol-relative targets', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('/\\evil.example')).toBe('/')
    expect(safeRedirect('javascript:alert(1)', '/home')).toBe('/home')
  })
})
