import { onScopeDispose, ref, shallowRef } from 'vue'
import { toApiRequestError, type ApiRequestError } from '@/services/http'

export type ResourceFetcher<A, T> = (arg: A, signal: AbortSignal) => Promise<T>

/**
 * Loading/error/data state for an API call that depends on an argument (a page request, an
 * id…). Starting a new load aborts the previous one, so a slow stale response can never
 * overwrite newer data. The in-flight request is aborted when the owning scope is disposed.
 */
export function useAsyncResource<A, T>(fetcher: ResourceFetcher<A, T>) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = shallowRef<ApiRequestError | null>(null)

  let controller: AbortController | null = null
  let lastArg: { value: A } | null = null

  async function load(arg: A): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    lastArg = { value: arg }

    loading.value = true
    error.value = null
    try {
      const result = await fetcher(arg, current.signal)
      if (current.signal.aborted) return
      data.value = result
    } catch (err) {
      if (current.signal.aborted) return
      data.value = null
      error.value = toApiRequestError(err)
    } finally {
      if (controller === current) {
        loading.value = false
        controller = null
      }
    }
  }

  /** Repeats the last request (e.g. after a 503). */
  function retry(): Promise<void> {
    return lastArg ? load(lastArg.value) : Promise.resolve()
  }

  /** Aborts any in-flight request and clears the state. */
  function reset(): void {
    controller?.abort()
    controller = null
    lastArg = null
    data.value = null
    error.value = null
    loading.value = false
  }

  onScopeDispose(() => controller?.abort())

  return { data, loading, error, load, retry, reset }
}
