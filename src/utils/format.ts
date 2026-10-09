// Display formatting for PokeAPI values (lowercase, hyphenated slugs) and numbers.

/**
 * Official spellings that can't be derived by title-casing the PokeAPI slug.
 * Keys are base names; forms such as "mr-mime-galar" reuse the base spelling.
 */
const SPECIAL_NAMES: Readonly<Record<string, string>> = {
  'mr-mime': 'Mr. Mime',
  'mr-rime': 'Mr. Rime',
  'mime-jr': 'Mime Jr.',
  'nidoran-f': 'Nidoran ♀',
  'nidoran-m': 'Nidoran ♂',
  farfetchd: 'Farfetch’d',
  sirfetchd: 'Sirfetch’d',
  'type-null': 'Type: Null',
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  'wo-chien': 'Wo-Chien',
  'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu',
  'chi-yu': 'Chi-Yu',
  flabebe: 'Flabébé',
}

const capitalize = (word: string): string =>
  word ? word.charAt(0).toUpperCase() + word.slice(1) : word

/** "lightning-rod" → "Lightning Rod". */
export function formatSlug(slug: string): string {
  return slug
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ')
}

/** "mr-mime" → "Mr. Mime", "pikachu" → "Pikachu", "deoxys-attack" → "Deoxys Attack". */
export function formatPokemonName(name: string): string {
  const slug = name.trim().toLowerCase()
  const exact = SPECIAL_NAMES[slug]
  if (exact) return exact

  const base = Object.keys(SPECIAL_NAMES).find((key) => slug.startsWith(`${key}-`))
  if (base) return `${SPECIAL_NAMES[base]} ${formatSlug(slug.slice(base.length + 1))}`

  return formatSlug(slug)
}

/** 25 → "#0025". */
export function formatPokedexId(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

const weightFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** 6.9 → "6.9 kg", 13 → "13.0 kg". */
export function formatWeightKg(weightKg: number): string {
  return `${weightFormatter.format(weightKg)} kg`
}

const integerFormatter = new Intl.NumberFormat('en-US')

/** 1302 → "1,302". */
export function formatCount(value: number): string {
  return integerFormatter.format(value)
}

const STAT_LABELS: Readonly<Record<string, string>> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Special Attack',
  'special-defense': 'Special Defense',
  speed: 'Speed',
}

/** "special-attack" → "Special Attack", "hp" → "HP". */
export function formatStatName(name: string): string {
  return STAT_LABELS[name] ?? formatSlug(name)
}

/**
 * Cleans PokeAPI flavor text: it contains form feeds / hard line breaks from the games and
 * the legacy "POKéMON" spelling.
 */
export function formatFlavorText(text: string): string {
  return text
    .replace(/[\f\n\r\t\u00ad]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/POKéMON/g, 'Pokémon')
    .trim()
}
