import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import ErrorState from '@/components/common/ErrorState.vue'

const mountError = (props: InstanceType<typeof ErrorState>['$props']) =>
  mount(ErrorState, { props, global: { plugins: [Quasar] } })

describe('ErrorState', () => {
  it('shows the message and error id as an alert', () => {
    const wrapper = mountError({ message: 'Service down', errorId: '6f1c2a9e' })

    expect(wrapper.get('[role="alert"]').text()).toContain('Service down')
    expect(wrapper.get('[data-test="error-id"]').text()).toBe('6f1c2a9e')
  })

  it('hides the error id when there is none', () => {
    const wrapper = mountError({ message: 'Offline' })
    expect(wrapper.find('[data-test="error-id"]').exists()).toBe(false)
  })

  it('offers a retry action only when retryable', async () => {
    expect(mountError({ message: 'Bad request' }).find('[data-test="retry"]').exists()).toBe(false)

    const wrapper = mountError({ message: 'Service down', retryable: true })
    await wrapper.get('[data-test="retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
