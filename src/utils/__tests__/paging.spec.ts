import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAGE_SIZE,
  isCanonicalPagingQuery,
  parsePagingQuery,
  toPageRequest,
  toPagingQuery,
} from '@/utils/paging'

describe('parsePagingQuery', () => {
  it('uses defaults when the query is empty', () => {
    expect(parsePagingQuery({})).toEqual({ page: 1, size: DEFAULT_PAGE_SIZE })
  })

  it('reads valid values', () => {
    expect(parsePagingQuery({ page: '3', size: '50' })).toEqual({ page: 3, size: 50 })
  })

  it.each([
    [{ page: '0' }],
    [{ page: '-2' }],
    [{ page: 'abc' }],
    [{ page: '1.5' }],
    [{ page: null }],
  ])('falls back to page 1 for %o', (query) => {
    expect(parsePagingQuery(query).page).toBe(1)
  })

  it.each([['0'], ['51'], ['ten']])('falls back to the default size for size=%s', (size) => {
    expect(parsePagingQuery({ size }).size).toBe(DEFAULT_PAGE_SIZE)
  })

  it('takes the first value of repeated params', () => {
    expect(parsePagingQuery({ page: ['2', '5'] }).page).toBe(2)
  })
})

describe('toPagingQuery / isCanonicalPagingQuery', () => {
  it('omits default values', () => {
    expect(toPagingQuery({ page: 1, size: DEFAULT_PAGE_SIZE })).toEqual({
      page: undefined,
      size: undefined,
    })
    expect(toPagingQuery({ page: 4, size: 10 })).toEqual({ page: '4', size: '10' })
  })

  it('detects non-canonical queries', () => {
    expect(isCanonicalPagingQuery({})).toBe(true)
    expect(isCanonicalPagingQuery({ page: '2', size: '10' })).toBe(true)
    expect(isCanonicalPagingQuery({ page: '1' })).toBe(false)
    expect(isCanonicalPagingQuery({ page: 'abc' })).toBe(false)
    expect(isCanonicalPagingQuery({ size: '20' })).toBe(false)
  })
})

describe('toPageRequest', () => {
  it('converts the 1-based UI page to the 0-based API page', () => {
    expect(toPageRequest({ page: 1, size: 20 })).toEqual({ page: 0, size: 20 })
    expect(toPageRequest({ page: 3, size: 10 })).toEqual({ page: 2, size: 10 })
  })
})
