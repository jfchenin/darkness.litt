import type { CollectionEntry } from 'astro:content'
import { OGImageRoute } from 'astro-og-canvas'
import { getCollection } from 'astro:content'
import { getPostDescription } from '@/utils/description'

const notoSansBoldPath = new URL('@/assets/fonts/NotoSansSC-Bold.otf', import.meta.url).pathname
const notoSansRegularPath = new URL('@/assets/fonts/NotoSansSC-Regular.otf', import.meta.url).pathname
const logoPngPath = new URL('@/assets/icons/og-logo.png', import.meta.url).pathname
// eslint-disable-next-line antfu/no-top-level-await
const [darknessPosts, emileMosellyPosts] = await Promise.all([
  getCollection('darkness'),
  getCollection('emileMoselly'),
])
const posts = [...darknessPosts, ...emileMosellyPosts]
// Create slug-to-metadata lookup object for blog posts
const pages = Object.fromEntries(
  posts.map((post: CollectionEntry<'darkness' | 'emileMoselly'>) => [
    post.id,
    {
      title: post.data.title,
      description: getPostDescription(post, 'og'),
    },
  ]),
)

// Configure Open Graph image generation route
export const { getStaticPaths, GET } = OGImageRoute({
  param: 'image',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    logo: {
      path: logoPngPath, // Required local path and PNG format
      size: [250],
    },
    border: {
      color: [242, 241, 245],
      width: 20,
    },
    font: {
      title: {
        families: ['Noto Sans SC'],
        weight: 'Bold',
        color: [34, 33, 36],
        lineHeight: 1.5,
      },
      description: {
        families: ['Noto Sans SC'],
        color: [72, 71, 74],
        lineHeight: 1.5,
      },
    },
    fonts: [
      notoSansBoldPath,
      notoSansRegularPath,
    ],
    bgGradient: [[242, 241, 245]],
  }),
})
