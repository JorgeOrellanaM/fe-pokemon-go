// Pokémon domain models returned by the backend (see API.md).

export interface Ability {
  name: string
  /** `true` for the hidden ability. Regular abilities come first. */
  hidden: boolean
}

export interface PokemonSummary {
  /** Pokédex number. */
  id: number
  /** Lowercase PokeAPI name, e.g. "mr-mime". Format it for display. */
  name: string
  /** Small 96×96 sprite. `null` for some forms. */
  spriteUrl: string | null
  /** English genus, e.g. "Seed Pokémon". */
  category: string | null
  weightKg: number
  abilities: Ability[]
}

export interface BaseStat {
  /** "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed" */
  name: string
  /** 0–255. */
  value: number
}

export interface EvolutionStage {
  id: number
  name: string
  evolvesTo: EvolutionStage[]
}

export interface PokemonDetails {
  id: number
  name: string
  imageUrl: string | null
  category: string | null
  types: string[]
  stats: BaseStat[]
  /** Empty string when none. */
  description: string
  evolutionChain: EvolutionStage
}

export interface LocalPokemon extends PokemonSummary {
  localizedName: string | null
  region: string | null
  tags: string[]
}

export interface UpdateLocalPokemonRequest {
  /** Max 100 chars. */
  localizedName: string | null
  /** Max 100 chars. */
  region: string | null
  /** Max 10, each max 50 chars, unique (case-insensitive). */
  tags: string[]
}
