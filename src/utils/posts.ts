// src/utils/posts.ts
import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import type { darknessPost, emileMosellyPost } from '@/types'
import { getCollection, render } from 'astro:content'
import { defaultLocale } from '@/config'
import { memoize } from '@/utils/cache'

export type PostCollection = 'darkness' | 'emileMoselly'
export type EnhancedPost = darknessPost | emileMosellyPost

const metaCache = new Map<string, { minutes: number }>()

/**
 * Add metadata including reading time to a post.
 */
async function addMetaToPost(
  post: CollectionEntry<PostCollection>,
): Promise<EnhancedPost> {
  const cacheKey = `${post.collection}-${post.id}-${post.data.lang || 'universal'}`
  const cachedMeta = metaCache.get(cacheKey)
  if (cachedMeta) {
    return {
      ...post,
      remarkPluginFrontmatter: cachedMeta,
    } as EnhancedPost
  }

  const { remarkPluginFrontmatter } = await render(post)
  const meta = remarkPluginFrontmatter as { minutes: number }
  metaCache.set(cacheKey, meta)

  return {
    ...post,
    remarkPluginFrontmatter: meta,
  } as EnhancedPost
}

/**
 * Find duplicate post slugs within the same language.
 */
export async function checkPostSlugDuplication(
  _collection: PostCollection,
  posts: CollectionEntry<PostCollection>[],
): Promise<string[]> {
  const slugMap = new Map<string, Set<string>>()
  const duplicates: string[] = []

  posts.forEach((post) => {
    const lang = post.data.lang
    const slug = post.data.abbrlink || post.id

    let slugSet = slugMap.get(lang)
    if (!slugSet) {
      slugSet = new Set()
      slugMap.set(lang, slugSet)
    }

    if (!slugSet.has(slug)) {
      slugSet.add(slug)
      return
    }

    if (!lang) {
      duplicates.push(`Duplicate slug "${slug}" found in universal post (applies to all languages)`)
    }
    else {
      duplicates.push(`Duplicate slug "${slug}" found in "${lang}" language post`)
    }
  })

  return duplicates
}

/**
 * Get all posts for a collection (including pinned, excluding drafts in production).
 */
async function _getPosts(collection: PostCollection, lang?: Language) {
  const currentLang = lang || defaultLocale

  const filteredPosts = await getCollection(
    collection,
    ({ data }) => {
      const shouldInclude = import.meta.env.DEV || !data.draft
      return shouldInclude && (data.lang === currentLang || data.lang === '')
    },
  )

  const enhancedPosts = await Promise.all(filteredPosts.map(addMetaToPost))

  return enhancedPosts.sort((a, b) =>
    b.data.published.valueOf() - a.data.published.valueOf(),
  )
}

const getPosts = memoize(_getPosts)

/**
 * Get all non-pinned posts for a collection.
 */
async function _getRegularPosts(collection: PostCollection, lang?: Language) {
  const posts = await getPosts(collection, lang)
  return posts.filter(post => !post.data.pin)
}

const getRegularPosts = memoize(_getRegularPosts)

/**
 * Get pinned posts sorted by pin priority.
 */
async function _getPinnedPosts(collection: PostCollection, lang?: Language) {
  const posts = await getPosts(collection, lang)
  return posts
    .filter(post => post.data.pin && post.data.pin > 0)
    .sort((a, b) => (b.data.pin ?? 0) - (a.data.pin ?? 0))
}

export const getPinnedPosts = memoize(_getPinnedPosts)

/**
 * Group posts by year; within each year sort by month then day.
 */
async function _getPostsByYear(
  collection: PostCollection,
  lang?: Language,
): Promise<Map<number, EnhancedPost[]>> {
  const posts = await getRegularPosts(collection, lang)
  const yearMap = new Map<number, EnhancedPost[]>()

  posts.forEach((post) => {
    const year = post.data.published.getFullYear()
    let yearPosts = yearMap.get(year)
    if (!yearPosts) {
      yearPosts = []
      yearMap.set(year, yearPosts)
    }
    yearPosts.push(post)
  })

  yearMap.forEach((yearPosts) => {
    yearPosts.sort((a, b) => {
      const aDate = a.data.published
      const bDate = b.data.published
      return bDate.getMonth() - aDate.getMonth() || bDate.getDate() - aDate.getDate()
    })
  })

  return new Map([...yearMap.entries()].sort((a, b) => b[0] - a[0]))
}

export const getPostsByYear = memoize(_getPostsByYear)

/**
 * Group posts by their tags.
 */
async function _getPostsGroupByTags(collection: PostCollection, lang?: Language) {
  const posts = await getPosts(collection, lang)
  const tagMap = new Map<string, EnhancedPost[]>()

  posts.forEach((post) => {
    post.data.tags?.forEach((tag: string) => {
      let tagPosts = tagMap.get(tag)
      if (!tagPosts) {
        tagPosts = []
        tagMap.set(tag, tagPosts)
      }
      tagPosts.push(post)
    })
  })

  return tagMap
}

const getPostsGroupByTags = memoize(_getPostsGroupByTags)

/**
 * Get all tags sorted by post count for a collection.
 */
async function _getAllTags(collection: PostCollection, lang?: Language) {
  const tagMap = await getPostsGroupByTags(collection, lang)
  const tagsWithCount = Array.from(tagMap.entries())

  tagsWithCount.sort((a, b) => b[1].length - a[1].length)
  return tagsWithCount.map(([tag]) => tag)
}

export const getAllTags = memoize(_getAllTags)

/**
 * Get all posts that contain a specific tag.
 */
async function _getPostsByTag(
  collection: PostCollection,
  tag: string,
  lang?: Language,
) {
  const tagMap = await getPostsGroupByTags(collection, lang)
  return tagMap.get(tag) ?? []
}

export const getPostsByTag = memoize(_getPostsByTag)
