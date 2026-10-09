import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import LocalPokemonForm from '@/components/pokemon/LocalPokemonForm.vue'
import { ApiRequestError } from '@/services/http'
import type { LocalPokemonFormValues } from '@/utils/localPokemonForm'

const initial: LocalPokemonFormValues = {
  localizedName: 'Bulbizarre',
  region: 'Kanto',
  tags: ['starter'],
}

let wrapper: VueWrapper | undefined

function mountForm(props: Partial<{ saving: boolean; serverError: ApiRequestError | null }> = {}) {
  wrapper = mount(LocalPokemonForm, {
    props: { initial, saving: false, serverError: null, ...props },
    global: { plugins: [Quasar] },
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => wrapper?.unmount())

const field = (w: VueWrapper, test: string) => w.get(`input[data-test="${test}"]`)
const lastDirty = (w: VueWrapper) => {
  const events = w.emitted('update:dirty') ?? []
  return events[events.length - 1]
}
const saveButton = (w: VueWrapper) => w.get('button[data-test="save"]')
// QForm emits "submit" after its (async) validation.
const submit = async (w: VueWrapper) => {
  await w.get('form').trigger('submit')
  await flushPromises()
}

describe('LocalPokemonForm', () => {
  it('starts with the current values and nothing to save', () => {
    const w = mountForm()
    expect((field(w, 'localized-name-input').element as HTMLInputElement).value).toBe('Bulbizarre')
    expect(w.text()).toContain('starter')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  it('becomes dirty on a meaningful change and emits the trimmed request', async () => {
    const w = mountForm()
    await field(w, 'region-input').setValue('  Johto  ')

    expect(lastDirty(w)).toEqual([true])
    expect(saveButton(w).attributes('disabled')).toBeUndefined()

    await submit(w)
    expect(w.emitted('submit')?.[0]).toEqual([
      { localizedName: 'Bulbizarre', region: 'Johto', tags: ['starter'] },
    ])
  })

  it('does not count whitespace-only edits as changes', async () => {
    const w = mountForm()
    await field(w, 'region-input').setValue('Kanto   ')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  it('sends empty fields as null to clear them ("Clear all")', async () => {
    const w = mountForm()
    await w.get('button[data-test="clear"]').trigger('click')
    await submit(w)
    expect(w.emitted('submit')?.[0]).toEqual([{ localizedName: null, region: null, tags: [] }])
  })

  it('shows live character counters linked to the inputs', async () => {
    const w = mountForm()
    const input = field(w, 'localized-name-input')
    const describedBy = input.attributes('aria-describedby')!
    expect(w.get(`#${describedBy.split(' ')[0]}`).text()).toBe('10 / 100 characters')

    await input.setValue('Bulbi')
    expect(w.get(`#${describedBy.split(' ')[0]}`).text()).toBe('5 / 100 characters')
  })

  it('blocks submit on client errors and focuses the first invalid field', async () => {
    const w = mountForm()
    await field(w, 'region-input').setValue('x'.repeat(101))
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    const region = field(w, 'region-input')
    expect(region.attributes('aria-invalid')).toBe('true')
    expect(w.get('[data-test="form-summary"]').text()).toContain(
      'Please fix the highlighted fields.',
    )
    await vi.waitFor(() => expect(document.activeElement).toBe(region.element))
  })

  it('maps server field errors onto the inputs, keeps values and focuses the first one', async () => {
    const w = mountForm()
    await field(w, 'localized-name-input').setValue('Bulbizarre!')
    await w.setProps({
      serverError: new ApiRequestError({
        status: 400,
        message: 'Please check the highlighted fields.',
        errorId: '7a2be9d0',
        fieldErrors: [
          { field: 'tags', message: 'must not contain empty tags' },
          { field: 'tags', message: 'must not contain duplicate tags' },
          { field: 'tags[1]', message: 'has an invalid value' },
          { field: 'region', message: 'must be at most 100 characters' },
          { field: 'regoin', message: 'is not a recognized field' },
        ],
      }),
    })

    const region = field(w, 'region-input')
    expect(region.attributes('aria-invalid')).toBe('true')
    const regionErrorId = region.attributes('aria-describedby')!.split(' ').pop()!
    expect(w.get(`#${regionErrorId}`).text()).toBe('Must be at most 100 characters.')

    const tags = w.get('input[data-test="tag-text"]')
    expect(tags.attributes('aria-invalid')).toBe('true')
    expect(w.text()).toContain(
      'Must not contain empty tags. Must not contain duplicate tags. Has an invalid value.',
    )

    const summary = w.get('[data-test="form-summary"]')
    expect(summary.text()).toContain('Please check the highlighted fields.')
    expect(summary.text()).toContain('regoin: is not a recognized field')
    expect(w.get('[data-test="form-error-id"]').text()).toBe('7a2be9d0')

    // Typed values are kept.
    expect((field(w, 'localized-name-input').element as HTMLInputElement).value).toBe('Bulbizarre!')
    await vi.waitFor(() => expect(document.activeElement).toBe(region.element))

    // Editing a field clears its server errors.
    await region.setValue('Johto')
    expect(field(w, 'region-input').attributes('aria-invalid')).toBeUndefined()
  })

  it('shows non-field errors with their id', async () => {
    const w = mountForm()
    await w.setProps({
      serverError: new ApiRequestError({
        status: 503,
        message: 'The service is temporarily unavailable. Please try again later.',
        errorId: 'b41d07c3',
      }),
    })
    const summary = w.get('[data-test="form-summary"]')
    expect(summary.attributes('role')).toBe('alert')
    expect(summary.text()).toContain('temporarily unavailable')
    expect(summary.text()).toContain('b41d07c3')
  })

  it('resets to the initial values', async () => {
    const w = mountForm()
    await field(w, 'region-input').setValue('Johto')
    await w.get('button[data-test="reset"]').trigger('click')

    expect((field(w, 'region-input').element as HTMLInputElement).value).toBe('Kanto')
    expect(lastDirty(w)).toEqual([false])
  })

  it('disables the inputs and actions while saving', async () => {
    const w = mountForm()
    await field(w, 'region-input').setValue('Johto')
    await w.setProps({ saving: true })

    expect(field(w, 'region-input').attributes('disabled')).toBeDefined()
    expect(saveButton(w).attributes('disabled')).toBeDefined()
    await submit(w)
    expect(w.emitted('submit')).toBeUndefined()
  })

  it('emits cancel', async () => {
    const w = mountForm()
    await w.get('button[data-test="cancel"]').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
  })
})
