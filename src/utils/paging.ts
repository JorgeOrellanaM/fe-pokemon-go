// Paging state kept in the route query. The URL uses a 1-based `page` (what users see);
// the API uses a 0-based one — convert with `toPageRequest`.
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { PageRequest } from '@/types/api'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 30, 50]

export interface PagingState {
  /** 1-based page number, as shown to the user and kept in the URL. */
  page: number
  size: number
}

/**
 * Route query shape for paging; defaults are omitted to keep URLs clean.
 * A type alias (not an interface) so it is assignable to vue-router's `LocationQueryRaw`.
 */
export type PagingQuery = {
  page?: string
  size?: string
}

function parsePositiveInt(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

/** Reads `?page=&size=` leniently: missing or invalid values fall back to the defaults. */
export function parsePagingQuery(query: LocationQuery): PagingState {
  const size = parsePositiveInt(query.size)
  return {
    page: parsePositiveInt(query.page) ?? 1,
    size: size !== null && size <= MAX_PAGE_SIZE ? size : DEFAULT_PAGE_SIZE,
  }
}

export function toPagingQuery(state: PagingState): PagingQuery {
  return {
    page: state.page > 1 ? String(state.page) : undefined,
    size: state.size !== DEFAULT_PAGE_SIZE ? String(state.size) : undefined,
  }
}

/** True when the query already holds exactly the canonical representation of its paging state. */
export function isCanonicalPagingQuery(query: LocationQuery): boolean {
  const canonical = toPagingQuery(parsePagingQuery(query))
  return query.page === canonical.page && query.size === canonical.size
}

export function toPageRequest(state: PagingState): PageRequest {
  return { page: state.page - 1, size: state.size }
}
