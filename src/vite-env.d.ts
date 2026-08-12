/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_CHANNEL?: string
  readonly VITE_AK_SECURITY?: string
  readonly VITE_AK_CATALOGS?: string
  readonly VITE_AK_CROSS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
