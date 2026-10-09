import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import PokemonStats from '@/components/pokemon/PokemonStats.vue'

const stats = [
  { name: 'hp', value: 45 },
  { name: 'attack', value: 49 },
  { name: 'special-attack', value: 255 },
]

const mountStats = (value = stats) =>
  mount(PokemonStats, { props: { stats: value }, global: { plugins: [Quasar] } })

describe('PokemonStats', () => {
  it('renders one labelled meter per stat on a 0–255 scale', () => {
    const wrapper = mountStats()
    const meters = wrapper.findAll('[role="meter"]')

    expect(meters).toHaveLength(3)
    const hp = meters[0]!
    expect(hp.attributes('aria-valuemin')).toBe('0')
    expect(hp.attributes('aria-valuemax')).toBe('255')
    expect(hp.attributes('aria-valuenow')).toBe('45')
    expect(hp.attributes('aria-valuetext')).toBe('45 out of 255')

    const label = wrapper.get(`#${hp.attributes('aria-labelledby')}`)
    expect(label.text()).toBe('HP')
    expect(wrapper.findAll('[data-test="stat"]')[2]?.text()).toContain('Special Attack')
  })

  it('sizes the bar relative to the maximum', () => {
    const fill = mountStats().findAll('[role="meter"] > div')[2]!
    expect(fill.attributes('style')).toContain('width: 100%')
  })

  it('shows the total', () => {
    expect(mountStats().get('[data-test="stat-total"]').text()).toBe('349')
  })

  it('handles an empty list', () => {
    expect(mountStats([]).text()).toContain('No base stats available.')
  })
})
