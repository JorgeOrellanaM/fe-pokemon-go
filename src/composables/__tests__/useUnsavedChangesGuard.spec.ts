import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Dialog } from 'quasar'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'
import { confirmDiscardChanges, useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

vi.mock('quasar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quasar')>()),
  Dialog: { create: vi.fn<(typeof import('quasar'))['Dialog']['create']>() },
}))

const dirty = ref(false)
const confirm = vi.fn<() => Promise<boolean>>()
let wrapper: VueWrapper | undefined

async function setup() {
  const Editor = defineComponent({
    setup() {
      useUnsavedChangesGuard(() => dirty.value, confirm)
      return () => null
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/edit', component: Editor },
      { path: '/other', component: { template: '<div />' } },
    ],
  })
  await router.push('/edit')
  wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return router
}

afterEach(() => {
  wrapper?.unmount()
  dirty.value = false
  confirm.mockReset()
})

describe('useUnsavedChangesGuard', () => {
  it('lets the user leave without asking when there are no changes', async () => {
    const router = await setup()
    await router.push('/other')
    expect(confirm).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/other')
  })

  it('stays on the page when the user keeps editing', async () => {
    const router = await setup()
    dirty.value = true
    confirm.mockResolvedValue(false)

    await router.push('/other')

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/edit')
  })

  it('leaves when the user discards the changes', async () => {
    const router = await setup()
    dirty.value = true
    confirm.mockResolvedValue(true)

    await router.push('/other')

    expect(router.currentRoute.value.path).toBe('/other')
  })

  it('triggers the browser prompt on unload only when dirty', async () => {
    await setup()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    dirty.value = true
    const unsaved = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unsaved)
    expect(unsaved.defaultPrevented).toBe(true)
  })

  it('stops listening for unload once unmounted', async () => {
    await setup()
    dirty.value = true
    wrapper?.unmount()
    wrapper = undefined

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('confirmDiscardChanges', () => {
  function mockDialog(outcome: 'ok' | 'cancel') {
    vi.mocked(Dialog.create).mockImplementation(() => {
      const chain = {
        onOk: (fn: () => void) => {
          if (outcome === 'ok') fn()
          return chain
        },
        onCancel: (fn: () => void) => {
          if (outcome === 'cancel') fn()
          return chain
        },
      }
      return chain as unknown as ReturnType<typeof Dialog.create>
    })
  }

  it('resolves true when the user discards', async () => {
    mockDialog('ok')
    await expect(confirmDiscardChanges()).resolves.toBe(true)
    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discard unsaved changes?', focus: 'cancel' }),
    )
  })

  it('resolves false when the user keeps editing or dismisses', async () => {
    mockDialog('cancel')
    await expect(confirmDiscardChanges()).resolves.toBe(false)
  })
})
