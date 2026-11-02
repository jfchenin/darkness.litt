// admin/src/env.d.ts
/// <reference types="astro/client" />
import type { Runtime } from '@astrojs/cloudflare'
import type { R2Bucket } from '@cloudflare/workers-types'

interface Env {
  MEDIA: R2Bucket
}

declare global {
  namespace App {
    interface Locals extends Runtime<Env> {}
  }
}
