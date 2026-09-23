/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Alamat backend, mis. 'http://localhost:8000'. Diatur di berkas .env. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
