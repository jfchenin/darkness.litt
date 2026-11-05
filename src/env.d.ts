/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_BOTPOISON_PUBLIC_KEY: string
    readonly BOTPOISON_SECRET_KEY: string
    readonly FORMSPARK_FORM_URL: string
    readonly FORMSPARK_WEBHOOK_SECRET: string
    readonly BREVO_API_KEY: string
    readonly BREVO_LIST_ID: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
