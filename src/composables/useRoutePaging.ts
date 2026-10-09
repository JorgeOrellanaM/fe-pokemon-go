import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PageRequest } from '@/types/api'
import {
  isCanonicalPagingQuery,
  parsePagingQuery,
  toPageRequest,
  toPagingQuery,
  type PagingState,
} from '@/utils/paging'

/**
 * Paging state kept in the route query (`?page=&size=`, 1-based page): shareable URLs and
 * back/forward navigation for free. Used by every paged list page.
 */
export function useRoutePaging() {
  const route = useRoute()
  const router = useRouter()

  const paging = computed(() => parsePagingQuery(route.query))
  const pageRequest = computed<PageRequest>(() => toPageRequest(paging.value))
  const pagingQuery = computed(() => toPagingQuery(paging.value))

  function navigate(state: PagingState) {
    void router.push({ query: { ...route.query, ...toPagingQuery(state) } })
  }

  /** Fixes invalid/default values in the URL without adding a history entry. */
  function normalizeQuery() {
    if (!isCanonicalPagingQuery(route.query)) {
      void router.replace({ query: { ...route.query, ...pagingQuery.value } })
    }
  }

  const currentPage = computed({
    get: () => paging.value.page,
    set: (page: number) => navigate({ page, size: paging.value.size }),
  })

  const pageSize = computed({
    get: () => paging.value.size,
    // Changing the size resets to the first page so users don't land on an empty page.
    set: (size: number) => navigate({ page: 1, size }),
  })

  return { paging, pageRequest, pagingQuery, currentPage, pageSize, normalizeQuery }
}
