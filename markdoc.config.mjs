// markdoc.config.mjs
import { component, defineMarkdocConfig } from '@astrojs/markdoc/config'

export default defineMarkdocConfig({
  tags: {
    articleImage: {
      render: component('./src/components/ArticleImage.astro'),
      attributes: {
        src: { type: String, required: true },
        alt: { type: String, required: true },
        orientation: { type: String, required: true },
        hideCaption: { type: Boolean, required: true },
      },
    },
    ornament: {
      render: component('./src/components/Ornament.astro'),
      selfClosing: true,
      attributes: {
        text: { type: String },
      },
    },
  },
})
