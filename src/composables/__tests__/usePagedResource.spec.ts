import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { usePagedResource, type PageFetcher } from '@/composables/usePagedResource'
import { ApiRequestError } from '@/services/http'
import type { Page } from '@/types/api'

function pageOf(items: number[], page = 0): Page<number> {
  return { items, page, size: 20, totalElements: 100, totalPages: 5 }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(fetcher: PageFetcher<number>) {
  const scope = effectScope()
  const resource = scope.run(() => usePagedResource(fetcher))!
  return { ...resource, scope }
}

describe('usePagedResource', () => {
  it('exposes loading and data for a successful load', async () => {
    const pending = deferred<Page<number>>()
    const { data, loading, error, load } = setup(() => pending.promise)

    const promise = load({ page: 0, size: 20 })
    expect(loading.value).toBe(true)

    pending.resolve(pageOf([1, 2]))
    await promise

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(data.value?.items).toEqual([1, 2])
  })

  it('exposes the ApiRequestError on failure', async () => {
    const failure = new ApiRequestError({ status: 503, message: 'Unavailable', errorId: 'abc' })
    const { data, loading, error, load } = setup(() => Promise.reject(failure))

    await load({ page: 0, size: 20 })

    expect(loading.value).toBe(false)
    expect(data.value).toBeNull()
    expect(error.value).toBe(failure)
  })

  it('ignores stale responses and aborts the previous request', async () => {
    const first = deferred<Page<number>>()
    const second = deferred<Page<number>>()
    const signals: AbortSignal[] = []
    const fetcher = vi
      .fn<PageFetcher<number>>()
      .mockImplementationOnce((_req, signal) => {
        signals.push(signal)
        return first.promise
      })
      .mockImplementationOnce((_req, signal) => {
        signals.push(signal)
        return second.promise
      })
    const { data, loading, load } = setup(fetcher)

    const p1 = load({ page: 0, size: 20 })
    const p2 = load({ page: 1, size: 20 })
    expect(signals[0]?.aborted).toBe(true)

    second.resolve(pageOf([21], 1))
    await p2
    first.resolve(pageOf([1], 0))
    await p1

    expect(data.value?.items).toEqual([21])
    expect(loading.value).toBe(false)
  })

  it('retries the last request', async () => {
    const fetcher = vi
      .fn<PageFetcher<number>>()
      .mockRejectedValueOnce(new ApiRequestError({ status: 500, message: 'Oops' }))
      .mockResolvedValueOnce(pageOf([1]))
    const { data, error, load, retry } = setup(fetcher)

    await load({ page: 3, size: 10 })
    expect(error.value).not.toBeNull()

    await retry()
    expect(fetcher).toHaveBeenLastCalledWith({ page: 3, size: 10 }, expect.any(AbortSignal))
    expect(error.value).toBeNull()
    expect(data.value?.items).toEqual([1])
  })

  it('aborts the in-flight request when the scope is disposed', () => {
    let captured: AbortSignal | undefined
    const { load, scope } = setup((_req, signal) => {
      captured = signal
      return new Promise(() => {})
    })

    void load({ page: 0, size: 20 })
    scope.stop()

    expect(captured?.aborted).toBe(true)
  })
})
