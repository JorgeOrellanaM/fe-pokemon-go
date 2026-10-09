import { describe, expect, it } from 'vitest'
import {
  hasFieldMessages,
  isSameRequest,
  mapServerFieldErrors,
  toFormValues,
  toUpdateRequest,
  validateForm,
  validateNewTag,
} from '@/utils/localPokemonForm'

const chars = (n: number) => 'a'.repeat(n)

describe('toFormValues / toUpdateRequest', () => {
  it('turns nulls into empty inputs', () => {
    expect(toFormValues({ localizedName: null, region: null, tags: [] })).toEqual({
      localizedName: '',
      region: '',
      tags: [],
    })
  })

  it('trims values, sends empty strings as null and always includes the three fields', () => {
    expect(
      toUpdateRequest({ localizedName: '  Pikachu ', region: '   ', tags: [' mascot ', ' '] }),
    ).toEqual({ localizedName: 'Pikachu', region: null, tags: ['mascot'] })
  })

  it('ignores whitespace-only edits when comparing', () => {
    const a = { localizedName: 'Pikachu', region: '', tags: ['mascot'] }
    expect(isSameRequest(a, { localizedName: ' Pikachu ', region: ' ', tags: ['mascot '] })).toBe(
      true,
    )
    expect(isSameRequest(a, { ...a, tags: ['mascot', 'electric'] })).toBe(false)
    expect(isSameRequest(a, { ...a, region: 'Kanto' })).toBe(false)
  })
})

describe('validateForm', () => {
  it('accepts values at the limits (after trimming)', () => {
    const errors = validateForm({
      localizedName: ` ${chars(100)} `,
      region: chars(100),
      tags: Array.from({ length: 10 }, (_, i) => `${chars(48)}${i}`),
    })
    expect(hasFieldMessages(errors)).toBe(false)
  })

  it('rejects names and regions longer than 100 characters', () => {
    const errors = validateForm({ localizedName: chars(101), region: chars(101), tags: [] })
    expect(errors.localizedName).toEqual(['Must be at most 100 characters.'])
    expect(errors.region).toEqual(['Must be at most 100 characters.'])
  })

  it('reports every broken tag rule', () => {
    const tags = [
      'starter',
      'Starter',
      ' ',
      chars(51),
      ...Array.from({ length: 7 }, (_, i) => `t${i}`),
    ]
    expect(validateForm({ localizedName: '', region: '', tags }).tags).toEqual([
      'You can add up to 10 tags.',
      "Tags can't be empty.",
      'Each tag must be at most 50 characters.',
      'Tags must be unique.',
    ])
  })
})

describe('validateNewTag', () => {
  it('accepts a new tag', () => {
    expect(validateNewTag('electric', ['mascot'])).toBeNull()
  })

  it('rejects duplicates case-insensitively, naming the existing tag', () => {
    expect(validateNewTag(' MASCOT ', ['mascot'])).toBe(
      '“mascot” is already added (tags are not case-sensitive).',
    )
  })

  it('rejects empty, too long and over-the-limit tags', () => {
    expect(validateNewTag('  ', [])).toBe("Tags can't be empty.")
    expect(validateNewTag(chars(51), [])).toBe('Each tag must be at most 50 characters.')
    const ten = Array.from({ length: 10 }, (_, i) => `t${i}`)
    expect(validateNewTag('new', ten)).toBe('You can add up to 10 tags.')
  })
})

describe('mapServerFieldErrors', () => {
  it('maps indexed fields to their input and keeps repeated messages', () => {
    const mapped = mapServerFieldErrors([
      { field: 'localizedName', message: 'must be at most 100 characters' },
      { field: 'tags', message: 'must not contain empty tags' },
      { field: 'tags', message: 'must not contain duplicate tags' },
      { field: 'tags[1]', message: 'has an invalid value' },
      { field: 'tags[2]', message: 'has an invalid value' },
    ])

    expect(mapped.fields.localizedName).toEqual(['Must be at most 100 characters.'])
    expect(mapped.fields.tags).toEqual([
      'Must not contain empty tags.',
      'Must not contain duplicate tags.',
      'Has an invalid value.',
    ])
    expect(mapped.fields.region).toEqual([])
    expect(mapped.other).toEqual([])
  })

  it('collects fields the form does not have', () => {
    const mapped = mapServerFieldErrors([{ field: 'regoin', message: 'is not a recognized field' }])
    expect(mapped.other).toEqual(['regoin: is not a recognized field'])
    expect(hasFieldMessages(mapped.fields)).toBe(false)
  })
})
