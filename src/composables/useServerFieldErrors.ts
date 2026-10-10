import { shallowRef, watch, type ShallowRef } from 'vue'
import type { ApiRequestError } from '@/services/http'
import type { FieldError } from '@/types/api'
import { emptyMessages, mapFieldErrors } from '@/utils/fieldErrors'

export interface ServerFieldErrors<F extends string> {
  /** Server messages per input. A field's messages are cleared as soon as the user edits it. */
  fields: ShallowRef<Record<F, string[]>>
  /** Server errors for fields the form doesn't show. */
  other: ShallowRef<string[]>
}

/**
 * Keeps the field errors of the last failed submit (`errors[]` of a 400) on the inputs until
 * the user edits them. `toFieldErrors` can turn other errors into field errors (e.g. a 409
 * "username taken" onto the username input).
 */
export function useServerFieldErrors<F extends string>(
  fields: readonly F[],
  serverError: () => ApiRequestError | null,
  values: () => Record<F, unknown>,
  toFieldErrors: (error: ApiRequestError) => readonly FieldError[] = (error) => error.fieldErrors,
): ServerFieldErrors<F> {
  const fieldMessages = shallowRef(emptyMessages(fields))
  const other = shallowRef<string[]>([])

  watch(serverError, (error) => {
    const mapped = mapFieldErrors(error ? toFieldErrors(error) : [], fields)
    fieldMessages.value = mapped.fields
    other.value = mapped.other
  })

  for (const field of fields) {
    watch(
      () => values()[field],
      () => {
        if (fieldMessages.value[field].length === 0) return
        fieldMessages.value = { ...fieldMessages.value, [field]: [] }
      },
    )
  }

  return { fields: fieldMessages, other }
}
