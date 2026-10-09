import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import TagInput from '@/components/form/TagInput.vue'
import { validateNewTag } from '@/utils/localPokemonForm'

function mountTags(initial: string[] = [], props: Record<string, unknown> = {}) {
  const wrapper = mount(TagInput, {
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (value: string[]) => wrapper.setProps({ modelValue: value }),
      label: 'Tags',
      maxTags: 10,
      maxLength: 50,
      validate: validateNewTag,
      ...props,
    },
    global: { plugins: [Quasar] },
  })
  return wrapper
}

const input = (wrapper: ReturnType<typeof mountTags>) => wrapper.get('input')
const chipTexts = (wrapper: ReturnType<typeof mountTags>) =>
  wrapper.findAll('.q-chip__content').map((chip) => chip.text())

async function type(wrapper: ReturnType<typeof mountTags>, text: string) {
  await input(wrapper).setValue(text)
}

describe('TagInput', () => {
  it('adds a tag with Enter (trimmed) and clears the input', async () => {
    const wrapper = mountTags()
    await type(wrapper, '  starter ')
    await input(wrapper).trigger('keydown', { key: 'Enter' })

    expect(wrapper.props('modelValue')).toEqual(['starter'])
    expect(chipTexts(wrapper)).toEqual(['starter'])
    expect((input(wrapper).element as HTMLInputElement).value).toBe('')
  })

  it('adds a tag with a comma and splits pasted comma-separated text', async () => {
    const wrapper = mountTags()
    await type(wrapper, 'mascot')
    await input(wrapper).trigger('keydown', { key: ',' })
    await type(wrapper, 'electric, favorite')

    expect(wrapper.props('modelValue')).toEqual(['mascot', 'electric', 'favorite'])
  })

  it('rejects case-insensitive duplicates with feedback and keeps the text', async () => {
    const wrapper = mountTags(['Starter'])
    await type(wrapper, 'starter')
    await input(wrapper).trigger('keydown', { key: 'Enter' })

    expect(wrapper.props('modelValue')).toEqual(['Starter'])
    expect(wrapper.get('[role="alert"]').text()).toBe(
      '“Starter” is already added (tags are not case-sensitive).',
    )
    expect(input(wrapper).attributes('aria-invalid')).toBe('true')
    expect((input(wrapper).element as HTMLInputElement).value).toBe('starter')
  })

  it('flags a tag longer than the limit while typing', async () => {
    const wrapper = mountTags()
    await type(wrapper, 'x'.repeat(51))
    expect(wrapper.get('[role="alert"]').text()).toBe('Each tag must be at most 50 characters.')
  })

  it('removes a tag with its labelled remove button', async () => {
    const wrapper = mountTags(['starter', 'mascot'])
    await wrapper.get('[aria-label="Remove tag starter"]').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['mascot'])
  })

  it('shows the tag count and disables the input at the maximum', () => {
    const wrapper = mountTags(['a', 'b'], { maxTags: 2 })
    expect(wrapper.text()).toContain('2 / 2 tags')
    expect(wrapper.text()).toContain("You've reached the maximum of 2 tags")
    expect(input(wrapper).attributes('disabled')).toBeDefined()
  })

  it('links the hint and counter to the input', () => {
    const wrapper = mountTags()
    const describedBy = input(wrapper).attributes('aria-describedby')!.split(' ')
    expect(describedBy).toHaveLength(2)
    for (const id of describedBy) expect(wrapper.find(`#${id}`).exists()).toBe(true)
  })

  it('shows external (server) errors', () => {
    const wrapper = mountTags(['a'], { errors: ['Must not contain duplicate tags.'] })
    expect(wrapper.get('[role="alert"]').text()).toBe('Must not contain duplicate tags.')
  })

  it('commitPending() adds typed text and reports invalid text', async () => {
    const wrapper = mountTags(['mascot'])
    const api = wrapper.vm as unknown as { commitPending: () => boolean }

    await type(wrapper, 'electric')
    expect(api.commitPending()).toBe(true)
    await type(wrapper, 'MASCOT')
    expect(api.commitPending()).toBe(false)
    expect(wrapper.props('modelValue')).toEqual(['mascot', 'electric'])
  })
})
