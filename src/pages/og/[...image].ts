import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { OGImageRoute } from 'astro-og-canvas'
import { getCollection } from 'astro:content'
import { getPostDescription } from '@/utils/description'

let routePromise:
  | Promise<{
    GET: APIRoute
    getStaticPaths: GetStaticPaths
  }>
  | undefined

function getRoute() {
  if (!routePromise) {
    routePromise = (async () => {
      const [darknessPosts, emileMosellyPosts] = await Promise.all([
        getCollection('darkness'),
        getCollection('emileMoselly'),
      ])

      const posts = [...darknessPosts, ...emileMosellyPosts]

      const pages = Object.fromEntries(
        posts.map((post: CollectionEntry<'darkness' | 'emileMoselly'>) => [
          post.id,
          {
            title: post.data.title,
            description: getPostDescription(post, 'og'),
          },
        ]),
      )

      return OGImageRoute({
        param: 'image',
        pages,
        getImageOptions: (_path, page) => ({
          title: page.title,
          description: page.description,
          logo: {
            path: './public/icons/og-logo.png',
            size: [250],
          },
          border: {
            color: [242, 241, 245],
            width: 20,
          },
          font: {
            title: {
              families: ['Noto Sans'],
              weight: 'Bold',
              color: [34, 33, 36],
              lineHeight: 1.5,
            },
            description: {
              families: ['Noto Sans'],
              color: [72, 71, 74],
              lineHeight: 1.5,
            },
          },
          fonts: [
            './public/fonts/NotoSans-Bold.otf',
            './public/fonts/NotoSans-Regular.otf',
          ],
          bgGradient: [[242, 241, 245]],
        }),
      })
    })()
  }

  return routePromise
}

export const GET: APIRoute = async (ctx) => {
  const { GET } = await getRoute()
  return GET(ctx)
}

export const getStaticPaths: GetStaticPaths = async (options) => {
  const { getStaticPaths } = await getRoute()
  return getStaticPaths(options)
}
