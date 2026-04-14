/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_PORTAL_SELF_SIGNUP_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
