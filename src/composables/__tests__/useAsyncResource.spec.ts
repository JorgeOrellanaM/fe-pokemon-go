import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useAsyncResource, type ResourceFetcher } from '@/composables/useAsyncResource'
import { ApiRequestError } from '@/services/http'

function setup<A, T>(fetcher: ResourceFetcher<A, T>) {
  const scope = effectScope()
  const resource = scope.run(() => useAsyncResource(fetcher))!
  return { ...resource, scope }
}

describe('useAsyncResource', () => {
  it('passes the argument and an abort signal to the fetcher', async () => {
    const fetcher = vi.fn<ResourceFetcher<number, string>>().mockResolvedValue('pikachu')
    const { data, load } = setup(fetcher)

    await load(25)

    expect(fetcher).toHaveBeenCalledWith(25, expect.any(AbortSignal))
    expect(data.value).toBe('pikachu')
  })

  it('aborts the previous request when the argument changes', async () => {
    const signals: AbortSignal[] = []
    let resolveFirst!: (value: string) => void
    const fetcher = vi
      .fn<ResourceFetcher<number, string>>()
      .mockImplementationOnce((_id, signal) => {
        signals.push(signal)
        return new Promise((resolve) => (resolveFirst = resolve))
      })
      .mockImplementationOnce((_id, signal) => {
        signals.push(signal)
        return Promise.resolve('ivysaur')
      })
    const { data, load } = setup(fetcher)

    const first = load(1)
    await load(2)
    resolveFirst('bulbasaur')
    await first

    expect(signals[0]?.aborted).toBe(true)
    expect(data.value).toBe('ivysaur')
  })

  it('reset() aborts the in-flight request and clears the state', async () => {
    let captured: AbortSignal | undefined
    const { data, loading, error, load, reset, retry } = setup<number, string>((_id, signal) => {
      captured = signal
      return new Promise(() => {})
    })

    void load(1)
    expect(loading.value).toBe(true)
    reset()

    expect(captured?.aborted).toBe(true)
    expect(loading.value).toBe(false)
    expect(data.value).toBeNull()
    expect(error.value).toBeNull()
    await retry() // nothing to retry after a reset
  })

  it('keeps the error of the latest request', async () => {
    const failure = new ApiRequestError({ status: 404, message: 'Not found', errorId: 'x' })
    const { error, load } = setup<number, string>(() => Promise.reject(failure))

    await load(9999)

    expect(error.value).toBe(failure)
  })
})
