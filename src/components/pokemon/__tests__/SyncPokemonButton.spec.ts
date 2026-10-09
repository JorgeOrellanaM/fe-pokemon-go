import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createMemoryHistory, createRouter } from 'vue-router'
import SyncPokemonButton from '@/components/pokemon/SyncPokemonButton.vue'

async function mountButton(props: { synced: boolean; syncing: boolean }) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/collection/:id', name: 'local-pokemon', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(SyncPokemonButton, {
    props: {
      pokemonName: 'Pikachu',
      to: { name: 'local-pokemon', params: { id: '25' } },
      ...props,
    },
    global: { plugins: [Quasar, router] },
  })
  return { wrapper, router }
}

describe('SyncPokemonButton', () => {
  it('offers to add the Pokémon and emits "sync"', async () => {
    const { wrapper } = await mountButton({ synced: false, syncing: false })
    const button = wrapper.get('button')

    expect(button.text()).toContain('Add to collection')
    expect(button.attributes('aria-label')).toBe('Add Pikachu to your collection')
    await button.trigger('click')
    expect(wrapper.emitted('sync')).toHaveLength(1)
  })

  it('shows a loading state and ignores clicks while syncing', async () => {
    const { wrapper } = await mountButton({ synced: false, syncing: true })
    const button = wrapper.get('button')

    expect(button.text()).toContain('Adding…')
    await button.trigger('click')
    expect(wrapper.emitted('sync')).toBeUndefined()
  })

  it('opens the local entry once synced', async () => {
    const { wrapper, router } = await mountButton({ synced: true, syncing: false })
    const button = wrapper.get('button')

    expect(button.text()).toContain('In collection')
    expect(button.attributes('aria-label')).toBe('Pikachu is in your collection. View entry')
    await button.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/collection/25'))
    expect(wrapper.emitted('sync')).toBeUndefined()
  })
})
