// admin/astro.config.ts
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import keystatic from '@keystatic/astro'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

// Inline the storage mode at build time: keystatic.config.ts is also bundled for the browser,
// where non-PUBLIC env vars are otherwise undefined.
const { KEYSTATIC_STORAGE } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')
const keystaticStorage = process.env.KEYSTATIC_STORAGE ?? KEYSTATIC_STORAGE ?? ''

export default defineConfig({
  integrations: [react(), keystatic()],

  adapter: cloudflare({ imageService: 'passthrough' }),

  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
    define: {
      'import.meta.env.KEYSTATIC_STORAGE': JSON.stringify(keystaticStorage),
    },
    optimizeDeps: {
      // Prevent the Worker bundle from shipping raw CJS React
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },

  devToolbar: {
    enabled: false,
  },
})
