import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { ApiRequestError } from '@/services/http'

let wrapper: VueWrapper | undefined

function mountForm(props: Partial<{ loading: boolean; serverError: ApiRequestError | null }> = {}) {
  wrapper = mount(RegisterForm, {
    props: { loading: false, serverError: null, ...props },
    global: { plugins: [Quasar] },
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => wrapper?.unmount())

const input = (w: VueWrapper, test: string) => w.get(`input[data-test="${test}"]`)
const submit = async (w: VueWrapper) => {
  await w.get('form').trigger('submit')
  await flushPromises()
}

async function fill(w: VueWrapper, username: string, password: string, confirmation = password) {
  await input(w, 'username-input').setValue(username)
  await input(w, 'password-input').setValue(password)
  await input(w, 'confirmation-input').setValue(confirmation)
}

describe('RegisterForm', () => {
  it('emits the normalized username and the password as typed', async () => {
    const w = mountForm()
    await fill(w, '  Ash ', 'Pikachu 123!')

    expect(w.get('[data-test="username-preview"]').text()).toBe('ash')
    await submit(w)

    expect(w.emitted('submit')?.[0]).toEqual([{ username: 'ash', password: 'Pikachu 123!' }])
  })

  it('validates like the backend before submitting', async () => {
    const w = mountForm()
    await fill(w, 'a b', 'short', 'other')
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain("Use only letters, digits, '.', '_' and '-'.")
    expect(w.text()).toContain('Must be at least 8 characters.')
    expect(w.text()).toContain("The passwords don't match.")
    expect(document.activeElement).toBe(input(w, 'username-input').element)
  })

  it('does not show errors before the user has interacted', () => {
    const w = mountForm()
    expect(w.text()).not.toContain('Enter a username.')
  })

  it('shows the server field errors on the inputs until edited (400)', async () => {
    const w = mountForm()
    await fill(w, 'ash', 'Pikachu123!')
    await w.setProps({
      serverError: new ApiRequestError({
        status: 400,
        message: 'Please check the highlighted fields.',
        errorId: 'fc18f326',
        fieldErrors: [
          { field: 'password', message: 'must be between 8 and 72 characters' },
          { field: 'role', message: 'is not a recognized field' },
        ],
      }),
    })
    await flushPromises()

    expect(w.text()).toContain('Must be between 8 and 72 characters.')
    expect(w.get('[data-test="form-summary"]').text()).toContain(
      'Please check the highlighted fields.',
    )
    expect(w.get('[data-test="form-summary"]').text()).toContain('role: is not a recognized field')
    expect(w.get('[data-test="form-error-id"]').text()).toBe('fc18f326')

    await input(w, 'password-input').setValue('Pikachu1234!')
    expect(w.text()).not.toContain('Must be between 8 and 72 characters.')
  })

  it('shows a taken username (409) on the username input', async () => {
    const w = mountForm()
    await fill(w, 'ash', 'Pikachu123!')
    await w.setProps({
      serverError: new ApiRequestError({
        status: 409,
        message: "The username 'ash' is already taken",
      }),
    })
    await flushPromises()

    expect(w.text()).toContain("The username 'ash' is already taken.")
    expect(w.find('[data-test="form-summary"]').exists()).toBe(false)
    expect(document.activeElement).toBe(input(w, 'username-input').element)
  })

  it('toggles the password visibility', async () => {
    const w = mountForm()
    const toggle = w.get('button[data-test="toggle-password"]')

    expect(input(w, 'password-input').attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('Show password')
    await toggle.trigger('click')
    expect(input(w, 'password-input').attributes('type')).toBe('text')
    expect(toggle.attributes('aria-pressed')).toBe('true')
  })
})
