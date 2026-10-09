import { useAsyncResource, type ResourceFetcher } from '@/composables/useAsyncResource'
import type { Page, PageRequest } from '@/types/api'

export type PageFetcher<T> = ResourceFetcher<PageRequest, Page<T>>

/**
 * Async state for a paged list endpoint (catalog now, local Pokémon later).
 * See {@link useAsyncResource} for the cancellation semantics.
 */
export function usePagedResource<T>(fetchPage: PageFetcher<T>) {
  return useAsyncResource(fetchPage)
}
