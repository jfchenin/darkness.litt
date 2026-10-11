// src/utils/tags.ts
import type { Language } from '@/i18n/config'
import { allLocales } from '@/config'
import { memoize } from '@/utils/cache'
import { getAllTags as getCollectionTags, getPostsByTag } from '@/utils/posts'

type Locale = typeof allLocales[number]

/**
 * Get all tags from both darkness and emileMoselly collections.
 */
async function _getAllTags(lang: Language): Promise<string[]> {
  const [darknessTags, mosellyTags] = await Promise.all([
    getCollectionTags('darkness', lang),
    getCollectionTags('emileMoselly', lang),
  ])
  return [...new Set([...darknessTags, ...mosellyTags])]
}

export const getAllTags = memoize(_getAllTags)

/**
 * Get supported languages for a specific tag across both collections.
 */
async function _getTagSupportedLangs(tag: string): Promise<Locale[]> {
  const langsSet = new Set<Locale>()

  await Promise.all(allLocales.map(async (lang) => {
    const [darknessPosts, mosellyPosts] = await Promise.all([
      getPostsByTag('darkness', tag, lang),
      getPostsByTag('emileMoselly', tag, lang),
    ])
    if (darknessPosts.length > 0 || mosellyPosts.length > 0) {
      langsSet.add(lang)
    }
  }))

  return Array.from(langsSet)
}

export const getTagSupportedLangs = memoize(_getTagSupportedLangs)
