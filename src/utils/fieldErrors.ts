// Maps backend `errors[]` (400 responses) onto the inputs of a form. Shared by every form.
import type { FieldError } from '@/types/api'

/** "must be at most 100 characters" → "Must be at most 100 characters." */
export function toSentence(message: string): string {
  const text = message.trim()
  if (!text) return text
  const sentence = text.charAt(0).toUpperCase() + text.slice(1)
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}

export interface MappedFieldErrors<F extends string> {
  /** Messages per input (a field can have several). */
  fields: Record<F, string[]>
  /** Errors for fields the form doesn't have (e.g. an unknown JSON field), shown in a summary. */
  other: string[]
}

export function emptyMessages<F extends string>(fields: readonly F[]): Record<F, string[]> {
  return Object.fromEntries(fields.map((field) => [field, []])) as unknown as Record<F, string[]>
}

/** "tags[1]" → tags, "address.city" → address; repeated messages for a field are kept once. */
export function mapFieldErrors<F extends string>(
  errors: readonly FieldError[],
  fields: readonly F[],
): MappedFieldErrors<F> {
  const mapped = emptyMessages(fields)
  const other: string[] = []
  const isFormField = (field: string): field is F => (fields as readonly string[]).includes(field)

  for (const { field, message } of errors) {
    const base = field.split(/[[.]/)[0] ?? field
    const text = toSentence(message)
    if (isFormField(base)) {
      if (!mapped[base].includes(text)) mapped[base].push(text)
    } else {
      other.push(`${field}: ${message}`)
    }
  }
  return { fields: mapped, other }
}
