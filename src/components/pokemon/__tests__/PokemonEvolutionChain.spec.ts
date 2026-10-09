import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import PokemonEvolutionChain from '@/components/pokemon/PokemonEvolutionChain.vue'
import type { EvolutionStage } from '@/types/pokemon'

const bulbasaurChain: EvolutionStage = {
  id: 1,
  name: 'bulbasaur',
  evolvesTo: [{ id: 2, name: 'ivysaur', evolvesTo: [{ id: 3, name: 'venusaur', evolvesTo: [] }] }],
}

const eeveeChain: EvolutionStage = {
  id: 133,
  name: 'eevee',
  evolvesTo: [
    { id: 134, name: 'vaporeon', evolvesTo: [] },
    { id: 135, name: 'jolteon', evolvesTo: [] },
    { id: 136, name: 'flareon', evolvesTo: [] },
  ],
}

function mountChain(chain: EvolutionStage, currentId: number) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/pokemon/:id', name: 'pokemon-details', component: { template: '<div />' } }],
  })
  return mount(PokemonEvolutionChain, {
    props: {
      chain,
      currentId,
      linkFor: (id: number) => ({ name: 'pokemon-details', params: { id: String(id) } }),
    },
    global: { plugins: [Quasar, router] },
  })
}

describe('PokemonEvolutionChain', () => {
  it('highlights the current Pokémon and links the other stages', () => {
    const wrapper = mountChain(bulbasaurChain, 2)

    const current = wrapper.get('[data-test="evolution-current"]')
    expect(current.attributes('aria-current')).toBe('page')
    expect(current.text()).toContain('Ivysaur')
    expect(current.text()).toContain('Viewing')

    const links = wrapper.findAll('a[data-test="evolution-link"]')
    expect(links.map((link) => link.attributes('href'))).toEqual(['/pokemon/1', '/pokemon/3'])
    expect(links[0]?.text()).toContain('Bulbasaur')
  })

  it('nests the stages as a tree', () => {
    const wrapper = mountChain(bulbasaurChain, 1)
    const nested = wrapper.get('ul[aria-label="Evolutions of Ivysaur"]')
    expect(nested.text()).toContain('Venusaur')
  })

  it('renders every branch of a branching evolution', () => {
    const wrapper = mountChain(eeveeChain, 135)

    const branches = wrapper.get('ul[aria-label="Evolutions of Eevee"]').findAll(':scope > li')
    expect(branches).toHaveLength(3)
    expect(wrapper.get('[data-test="evolution-current"]').text()).toContain('Jolteon')
    expect(wrapper.findAll('a[data-test="evolution-link"]')).toHaveLength(3)
  })

  it('explains when a Pokémon does not evolve', () => {
    const wrapper = mountChain({ id: 128, name: 'tauros', evolvesTo: [] }, 128)
    expect(wrapper.get('[data-test="no-evolutions"]').text()).toBe('This Pokémon does not evolve.')
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
