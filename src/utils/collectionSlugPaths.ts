// src/utils/collectionSlugPaths.ts
import type { GetStaticPathsResult } from 'astro'
import type { Language } from '@/i18n/config'
import { getCollection } from 'astro:content'
import { allLocales } from '@/config'
import { getLangRouteParam } from '@/i18n/lang'
import { checkPostSlugDuplication, type PostCollection } from '@/utils/posts'

/**
 * Build getStaticPaths entries for a post collection slug route.
 */
export async function buildCollectionSlugPaths(
  collection: PostCollection,
): Promise<GetStaticPathsResult> {
  const posts = await getCollection(collection)

  const duplicates = await checkPostSlugDuplication(collection, posts)
  if (duplicates.length > 0) {
    throw new Error(`Duplicate post slugs:\n${duplicates.join('\n')}`)
  }

  const slugToLangsMap = new Map<string, Set<Language>>()

  for (const post of posts) {
    const slug = post.data.abbrlink || post.id
    const lang = post.data.lang

    let langSet = slugToLangsMap.get(slug)
    if (!langSet) {
      langSet = new Set()
      slugToLangsMap.set(slug, langSet)
    }

    if (lang) {
      langSet.add(lang as Language)
    }
    else {
      allLocales.forEach(locale => langSet.add(locale))
    }
  }

  const slugToLangs: Record<string, Language[]> = {}
  for (const [slug, langs] of slugToLangsMap) {
    slugToLangs[slug] = [...langs].sort((a, b) => allLocales.indexOf(a) - allLocales.indexOf(b))
  }

  return allLocales.flatMap(lang => posts
    .filter(post => import.meta.env.DEV || !post.data.draft)
    .filter(post => post.data.lang === lang || post.data.lang === '')
    .map((post) => {
      const slug = post.data.abbrlink || post.id
      return {
        params: { lang: getLangRouteParam(lang), slug },
        props: { post, supportedLangs: slugToLangs[slug] },
      }
    }),
  )
}
