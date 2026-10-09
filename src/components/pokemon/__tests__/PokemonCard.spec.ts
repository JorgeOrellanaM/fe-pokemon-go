import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import PokemonCard from '@/components/pokemon/PokemonCard.vue'
import type { PokemonSummary } from '@/types/pokemon'

const mrMime: PokemonSummary = {
  id: 122,
  name: 'mr-mime',
  spriteUrl: 'https://example.test/122.png',
  category: 'Barrier Pokémon',
  weightKg: 54.5,
  abilities: [
    { name: 'soundproof', hidden: false },
    { name: 'filter', hidden: false },
    { name: 'technician', hidden: true },
  ],
}

function mountCard(pokemon: PokemonSummary) {
  return mount(PokemonCard, { props: { pokemon }, global: { plugins: [Quasar] } })
}

describe('PokemonCard', () => {
  it('renders the formatted name, id, category, weight and abilities', () => {
    const wrapper = mountCard(mrMime)

    expect(wrapper.get('h2').text()).toBe('Mr. Mime')
    expect(wrapper.text()).toContain('#0122')
    expect(wrapper.get('[data-test="category"]').text()).toBe('Barrier Pokémon')
    expect(wrapper.get('[data-test="weight"]').text()).toBe('54.5 kg')

    const abilities = wrapper.findAll('[data-test="abilities"] li').map((li) => li.text())
    expect(abilities).toHaveLength(3)
    expect(abilities[0]).toContain('Soundproof')
    expect(abilities[2]).toContain('Technician')
    expect(abilities[2]).toContain('(hidden)')
    expect(abilities[0]).not.toContain('(hidden)')
  })

  it('labels the article with the Pokémon name', () => {
    const wrapper = mountCard(mrMime)
    const article = wrapper.get('article')
    expect(article.attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
  })

  it('renders the sprite with an accessible alt text', () => {
    const img = mountCard(mrMime).get('[data-test="image"]')
    expect(img.attributes('src')).toBe(mrMime.spriteUrl)
    expect(img.attributes('alt')).toBe('Mr. Mime sprite')
  })

  it('shows a placeholder when the sprite is missing', () => {
    const wrapper = mountCard({ ...mrMime, spriteUrl: null })
    expect(wrapper.find('[data-test="image"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="image-placeholder"]').attributes('aria-label')).toBe(
      'No sprite available for Mr. Mime',
    )
  })

  it('shows a placeholder when the sprite fails to load', async () => {
    const wrapper = mountCard(mrMime)
    await wrapper.get('[data-test="image"]').trigger('error')
    expect(wrapper.find('[data-test="image-placeholder"]').exists()).toBe(true)
  })

  it('handles a missing category and no abilities', () => {
    const wrapper = mountCard({ ...mrMime, category: null, abilities: [] })
    expect(wrapper.get('[data-test="category"]').text()).toBe('Category unknown')
    expect(wrapper.text()).toContain('No abilities listed')
  })

  it('renders the name as a link covering the card when "to" is set', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/pokemon/:id', name: 'pokemon-details', component: { template: '<div />' } },
      ],
    })
    const wrapper = mount(PokemonCard, {
      props: { pokemon: mrMime, to: { name: 'pokemon-details', params: { id: '122' } } },
      global: { plugins: [Quasar, router] },
    })

    const link = wrapper.get('h2 a[data-test="card-link"]')
    expect(link.attributes('href')).toBe('/pokemon/122')
    expect(link.text()).toBe('Mr. Mime')
    expect(wrapper.get('article').classes()).toContain('pokemon-card--link')
  })

  it('does not render a link without "to"', () => {
    expect(mountCard(mrMime).find('[data-test="card-link"]').exists()).toBe(false)
  })
})
