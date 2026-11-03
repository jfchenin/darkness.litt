import cloudflare from '@astrojs/cloudflare'
import markdoc from '@astrojs/markdoc'
import mdx from '@astrojs/mdx'
import partytown from '@astrojs/partytown'
import sitemap from '@astrojs/sitemap'
import Compress from 'astro-compress'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import rehypeMermaid from 'rehype-mermaid'
import rehypeSlug from 'rehype-slug'
import remarkBreaks from 'remark-breaks'
import remarkDirective from 'remark-directive'
import remarkMath from 'remark-math'
import UnoCSS from 'unocss/astro'
import { base, defaultLocale, themeConfig } from './src/config'
import { langMap } from './src/i18n/config'
import { ui } from './src/i18n/ui'
import { rehypeCodeCopyButton } from './src/plugins/rehype-code-copy-button.mjs'
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.mjs'
import { rehypeHeadingAnchor } from './src/plugins/rehype-heading-anchor.mjs'
import { rehypeImageProcessor } from './src/plugins/rehype-image-processor.mjs'
import { remarkContainerDirectives } from './src/plugins/remark-container-directives.mjs'
import { remarkLeafDirectives } from './src/plugins/remark-leaf-directives.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'

const { url: site } = themeConfig.site
const { imageHostURL } = themeConfig.preload ?? {}
const mediaRemotePattern = { protocol: 'https', hostname: 'cdn.chenin.fr' }
const imageConfig = {
  image: imageHostURL
    ? { domains: [imageHostURL], remotePatterns: [{ protocol: 'https' }, mediaRemotePattern] }
    : { remotePatterns: [mediaRemotePattern] },
}

export default defineConfig({
  site,
  base,

  // Not recommended to change
  trailingSlash: 'always',

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport', // hover, tap, viewport, load
  },

  ...imageConfig,

  i18n: {
    locales: Object.entries(langMap).map(([path, codes]) => ({
      path,
      codes: [...codes] as [string, ...string[]],
    })),
    defaultLocale,
  },

  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    mdx(),
    markdoc(),
    partytown({
      config: {
        forward: ['dataLayer.push', 'gtag'],
      },
    }),
    sitemap(),
    Compress({
      CSS: true,
      HTML: true,
      Image: false,
      JavaScript: true,
      SVG: false,
    }),
  ],

  markdown: {
    remarkPlugins: [
      remarkDirective,
      remarkMath,
      remarkBreaks,
      remarkContainerDirectives,
      remarkLeafDirectives,
      remarkReadingTime,
    ],
    rehypePlugins: [
      rehypeKatex,
      // rehype-mermaid Plugin generics do not match Astro's RehypePlugins tuple
      [rehypeMermaid as never, { strategy: 'pre-mermaid' }],
      rehypeSlug,
      rehypeHeadingAnchor,
      rehypeImageProcessor,
      rehypeExternalLinks,
      rehypeCodeCopyButton,
    ],
    remarkRehype: {
      footnoteLabel: ui[defaultLocale].footnotes,
      footnoteBackLabel: 'Retour au contenu',
    },
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      // Available themes: https://shiki.style/themes
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },

  vite: {
    define: {
      '__dirname': JSON.stringify('/'),
      'import.meta.dirname': JSON.stringify('/'),
    },
    optimizeDeps: {
      include: ['canvaskit-wasm'],
      exclude: ['astro-og-canvas'],
    },
    resolve: {
      alias: {
        'canvaskit-wasm/full': 'canvaskit-wasm/bin/full/canvaskit.js',
        // Client build: core entry pulls langium/vscode-jsonrpc deep imports that Vite cannot resolve
        'mermaid': 'mermaid/dist/mermaid.esm.min.mjs',
      },
    },
    ssr: {
      noExternal: ['astro-og-canvas', 'canvaskit-wasm'],
    },
    plugins: [
      {
        name: 'prefix-font-urls-with-base',
        transform(code, id) {
          if (!id.endsWith('src/styles/font.css')) {
            return null
          }

          return code.replace(/url\("\/fonts\//g, `url("${base}/fonts/`)
        },
      },
    ],
  },

  devToolbar: {
    enabled: false,
  },

  // For local development
  server: {
    headers: {
      'Access-Control-Allow-Origin': 'https://giscus.app',
    },
  },

  adapter: cloudflare({
    imageService: 'compile',
  }),
})
