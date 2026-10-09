/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend REST API. Defaults to `/api/v1` (proxied by Vite in development). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
