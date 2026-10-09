import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import LocalPokemonFields from '@/components/pokemon/LocalPokemonFields.vue'

const mountFields = (pokemon: {
  localizedName: string | null
  region: string | null
  tags: string[]
}) => mount(LocalPokemonFields, { props: { pokemon }, global: { plugins: [Quasar] } })

describe('LocalPokemonFields', () => {
  it('renders the custom fields', () => {
    const wrapper = mountFields({ localizedName: 'Bulbizarre', region: 'Kanto', tags: ['starter'] })

    expect(wrapper.get('[data-test="localized-name"]').text()).toBe('Bulbizarre')
    expect(wrapper.get('[data-test="region"]').text()).toBe('Kanto')
    expect(
      wrapper.findAll('[data-test="tags"] .q-chip__content').map((chip) => chip.text()),
    ).toEqual(['starter'])
  })

  it('shows placeholders for unset fields', () => {
    const wrapper = mountFields({ localizedName: null, region: null, tags: [] })

    expect(wrapper.get('[data-test="localized-name"]').text()).toBe('Not set')
    expect(wrapper.get('[data-test="region"]').text()).toBe('Not set')
    expect(wrapper.get('[data-test="tags"]').text()).toBe('No tags')
  })
})
