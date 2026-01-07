/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_BOTPOISON_PUBLIC_KEY: string
  readonly BOTPOISON_SECRET_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}
