// Backend REST contract — response envelope and shared types (see API.md).

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError }

export interface ApiError {
  status: number
  error: string
  /** User-friendly text, safe to show in the UI as-is. */
  message: string
  path: string
  /** ISO-8601, UTC. */
  timestamp: string
  /** 8-character id matching the backend log line. Show it so users can report it. */
  errorId: string
  /** Omitted when empty. */
  errors?: FieldError[]
}

export interface FieldError {
  /** e.g. "region", "tags", "tags[1]", "page". */
  field: string
  message: string
}

export interface Page<T> {
  items: T[]
  /** Zero-based page index. */
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Paging query parameters accepted by the list endpoints. */
export interface PageRequest {
  /** Zero-based, `>= 0`. */
  page: number
  /** `1`–`50`. */
  size: number
}
