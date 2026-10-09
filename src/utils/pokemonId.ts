/**
 * Parses a Pokédex number from a route param. Returns `null` unless it is a positive whole
 * number (the backend's rule for `{id}`), so invalid ids never reach the API.
 */
export function parsePokemonId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
