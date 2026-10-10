// Edit form for the custom fields of a local Pokémon: values, client-side validation that
// mirrors the backend rules (API.md, endpoint 6) and mapping of server field errors.
import type { FieldError } from '@/types/api'
import { mapFieldErrors, type MappedFieldErrors } from '@/utils/fieldErrors'
import type { LocalPokemon, UpdateLocalPokemonRequest } from '@/types/pokemon'

export const LOCALIZED_NAME_MAX_LENGTH = 100
export const REGION_MAX_LENGTH = 100
export const TAGS_MAX_COUNT = 10
export const TAG_MAX_LENGTH = 50

export type FormField = 'localizedName' | 'region' | 'tags'

/** Order of the inputs on screen (used to focus the first invalid one). */
export const FORM_FIELDS: readonly FormField[] = ['localizedName', 'region', 'tags']

/** Raw input values: strings are never null so inputs stay controlled. */
export interface LocalPokemonFormValues {
  localizedName: string
  region: string
  tags: string[]
}

export type FieldMessages = Record<FormField, string[]>

export function emptyFieldMessages(): FieldMessages {
  return { localizedName: [], region: [], tags: [] }
}

export function toFormValues(
  pokemon: Pick<LocalPokemon, 'localizedName' | 'region' | 'tags'>,
): LocalPokemonFormValues {
  return {
    localizedName: pokemon.localizedName ?? '',
    region: pokemon.region ?? '',
    tags: [...pokemon.tags],
  }
}

const trimToNull = (value: string): string | null => value.trim() || null

/**
 * Builds the PUT body: always the three fields (full-replace), trimmed, empty strings sent as
 * `null` (clears the value) and blank tags dropped.
 */
export function toUpdateRequest(values: LocalPokemonFormValues): UpdateLocalPokemonRequest {
  return {
    localizedName: trimToNull(values.localizedName),
    region: trimToNull(values.region),
    tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
  }
}

/** True when both values would produce the same request (whitespace-only edits don't count). */
export function isSameRequest(a: LocalPokemonFormValues, b: LocalPokemonFormValues): boolean {
  const left = toUpdateRequest(a)
  const right = toUpdateRequest(b)
  return (
    left.localizedName === right.localizedName &&
    left.region === right.region &&
    left.tags.length === right.tags.length &&
    left.tags.every((tag, index) => tag === right.tags[index])
  )
}

const tooLong = (max: number) => `Must be at most ${max} characters.`

/** Why `candidate` can't be added to `tags`, or `null` when it can. */
export function validateNewTag(candidate: string, tags: readonly string[]): string | null {
  const tag = candidate.trim()
  if (!tag) return "Tags can't be empty."
  if (tag.length > TAG_MAX_LENGTH) return `Each tag must be at most ${TAG_MAX_LENGTH} characters.`
  if (tags.length >= TAGS_MAX_COUNT) return `You can add up to ${TAGS_MAX_COUNT} tags.`
  const lower = tag.toLowerCase()
  const existing = tags.find((t) => t.trim().toLowerCase() === lower)
  if (existing) return `“${existing}” is already added (tags are not case-sensitive).`
  return null
}

/** Client-side validation mirroring the backend rules. Values are checked after trimming. */
export function validateForm(values: LocalPokemonFormValues): FieldMessages {
  const errors = emptyFieldMessages()

  if (values.localizedName.trim().length > LOCALIZED_NAME_MAX_LENGTH) {
    errors.localizedName.push(tooLong(LOCALIZED_NAME_MAX_LENGTH))
  }
  if (values.region.trim().length > REGION_MAX_LENGTH) {
    errors.region.push(tooLong(REGION_MAX_LENGTH))
  }

  const tags = values.tags.map((tag) => tag.trim())
  if (tags.length > TAGS_MAX_COUNT) errors.tags.push(`You can add up to ${TAGS_MAX_COUNT} tags.`)
  if (tags.some((tag) => !tag)) errors.tags.push("Tags can't be empty.")
  if (tags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
    errors.tags.push(`Each tag must be at most ${TAG_MAX_LENGTH} characters.`)
  }
  const lower = tags.filter(Boolean).map((tag) => tag.toLowerCase())
  if (new Set(lower).size !== lower.length) errors.tags.push('Tags must be unique.')

  return errors
}

export function hasFieldMessages(messages: FieldMessages): boolean {
  return FORM_FIELDS.some((field) => messages[field].length > 0)
}

export type MappedServerErrors = MappedFieldErrors<FormField>

/** Maps backend `errors[]` onto the inputs: "tags[1]" → tags; repeated fields are kept. */
export function mapServerFieldErrors(errors: readonly FieldError[]): MappedServerErrors {
  return mapFieldErrors(errors, FORM_FIELDS)
}
