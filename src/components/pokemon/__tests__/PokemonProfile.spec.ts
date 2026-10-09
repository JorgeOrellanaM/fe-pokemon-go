import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import PokemonProfile from '@/components/pokemon/PokemonProfile.vue'
import type { PokemonDetails } from '@/types/pokemon'

const bulbasaur: PokemonDetails = {
  id: 1,
  name: 'bulbasaur',
  imageUrl: 'https://example.test/artwork/1.png',
  category: 'Seed Pokémon',
  types: ['grass', 'poison'],
  stats: [],
  description: 'A strange seed was\nplanted on its\fback at birth.',
  evolutionChain: { id: 1, name: 'bulbasaur', evolvesTo: [] },
}

const mountProfile = (pokemon: PokemonDetails) =>
  mount(PokemonProfile, { props: { pokemon }, global: { plugins: [Quasar] } })

describe('PokemonProfile', () => {
  it('renders the artwork, id, name, category, types and description', () => {
    const wrapper = mountProfile(bulbasaur)

    expect(wrapper.get('h1').text()).toBe('Bulbasaur')
    expect(wrapper.text()).toContain('#0001')
    expect(wrapper.get('[data-test="category"]').text()).toBe('Seed Pokémon')
    expect(wrapper.get('[data-test="image"]').attributes('alt')).toBe(
      'Official artwork of Bulbasaur',
    )
    expect(wrapper.findAll('[data-test="types"] li').map((li) => li.text())).toEqual([
      'Grass',
      'Poison',
    ])
    expect(wrapper.get('[data-test="description"]').text()).toBe(
      'A strange seed was planted on its back at birth.',
    )
  })

  it('handles a missing image, category and description', () => {
    const wrapper = mountProfile({ ...bulbasaur, imageUrl: null, category: null, description: '' })

    expect(wrapper.find('[data-test="image"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="image-placeholder"]').attributes('aria-label')).toBe(
      'No image available for Bulbasaur',
    )
    expect(wrapper.get('[data-test="category"]').text()).toBe('Category unknown')
    expect(wrapper.get('[data-test="description"]').text()).toBe('No description available.')
  })
})
