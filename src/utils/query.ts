import type { LocationQueryValue } from 'vue-router'

/** First non-empty string of a route query value (`?a=x&a=y` → "x"), or `undefined`. */
export function queryString(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' && first ? first : undefined
}
