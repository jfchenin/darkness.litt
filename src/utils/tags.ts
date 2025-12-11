import type { Language } from '@/i18n/config'
import { allLocales } from '@/config'
import { memoize } from '@/utils/cache'
import { getPostsByTag as getDarknessPostsByTag, getAllTags as getDarknessTags } from '@/utils/darkness'
import { getPostsByTag as getMosellyPostsByTag, getAllTags as getMosellyTags } from '@/utils/emileMoselly'

type Locale = typeof allLocales[number]

/**
 * Get all tags from both darkness and emileMoselly collections
 *
 * @param lang The language code to filter by
 * @returns Array of unique tags from both collections
 */
async function _getAllTags(lang: Language): Promise<string[]> {
  const [darknessTags, mosellyTags] = await Promise.all([
    getDarknessTags(lang),
    getMosellyTags(lang),
  ])
  return [...new Set([...darknessTags, ...mosellyTags])]
}

export const getAllTags = memoize(_getAllTags)

/**
 * Get supported languages for a specific tag across both collections
 *
 * @param tag The tag name to check language support for
 * @returns Array of language codes that support the specified tag
 */
async function _getTagSupportedLangs(tag: string): Promise<Locale[]> {
  const langsSet = new Set<Locale>()

  await Promise.all(allLocales.map(async (lang) => {
    const [darknessPosts, mosellyPosts] = await Promise.all([
      getDarknessPostsByTag(tag, lang),
      getMosellyPostsByTag(tag, lang),
    ])
    if (darknessPosts.length > 0 || mosellyPosts.length > 0) {
      langsSet.add(lang)
    }
  }))

  return Array.from(langsSet)
}

export const getTagSupportedLangs = memoize(_getTagSupportedLangs)
