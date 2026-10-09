import { describe, expect, it } from 'vitest'
import {
  formatCount,
  formatFlavorText,
  formatPokedexId,
  formatPokemonName,
  formatSlug,
  formatStatName,
  formatWeightKg,
} from '@/utils/format'

describe('formatPokemonName', () => {
  it.each([
    ['bulbasaur', 'Bulbasaur'],
    ['pikachu', 'Pikachu'],
    ['mr-mime', 'Mr. Mime'],
    ['mime-jr', 'Mime Jr.'],
    ['nidoran-f', 'Nidoran ♀'],
    ['nidoran-m', 'Nidoran ♂'],
    ['farfetchd', 'Farfetch’d'],
    ['ho-oh', 'Ho-Oh'],
    ['porygon-z', 'Porygon-Z'],
    ['type-null', 'Type: Null'],
    ['tapu-koko', 'Tapu Koko'],
    ['deoxys-attack', 'Deoxys Attack'],
  ])('formats "%s" as "%s"', (input, expected) => {
    expect(formatPokemonName(input)).toBe(expected)
  })

  it('keeps the special spelling for regional forms', () => {
    expect(formatPokemonName('mr-mime-galar')).toBe('Mr. Mime Galar')
  })

  it('is tolerant to casing and surrounding whitespace', () => {
    expect(formatPokemonName('  Mr-Mime ')).toBe('Mr. Mime')
  })
})

describe('formatSlug', () => {
  it('title-cases hyphenated slugs', () => {
    expect(formatSlug('lightning-rod')).toBe('Lightning Rod')
    expect(formatSlug('overgrow')).toBe('Overgrow')
  })
})

describe('number formatting', () => {
  it('zero-pads the Pokédex id', () => {
    expect(formatPokedexId(1)).toBe('#0001')
    expect(formatPokedexId(25)).toBe('#0025')
    expect(formatPokedexId(10001)).toBe('#10001')
  })

  it('formats weight with one decimal and a unit', () => {
    expect(formatWeightKg(6.9)).toBe('6.9 kg')
    expect(formatWeightKg(13)).toBe('13.0 kg')
    expect(formatWeightKg(999.9)).toBe('999.9 kg')
  })

  it('groups thousands in counts', () => {
    expect(formatCount(1302)).toBe('1,302')
  })
})

describe('formatStatName', () => {
  it.each([
    ['hp', 'HP'],
    ['attack', 'Attack'],
    ['special-attack', 'Special Attack'],
    ['special-defense', 'Special Defense'],
    ['accuracy', 'Accuracy'],
  ])('formats "%s" as "%s"', (input, expected) => {
    expect(formatStatName(input)).toBe(expected)
  })
})

describe('formatFlavorText', () => {
  it('removes game line breaks / form feeds and fixes the legacy spelling', () => {
    expect(
      formatFlavorText(
        'A strange seed was\nplanted on its\fback at birth. The plant sprouts\nand grows with this POKéMON.',
      ),
    ).toBe(
      'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
    )
  })

  it('keeps an empty description empty', () => {
    expect(formatFlavorText('')).toBe('')
  })
})
