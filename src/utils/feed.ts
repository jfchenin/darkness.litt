import type { APIContext } from 'astro'
import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { loadRenderers } from 'astro:container'
import { getCollection, render } from 'astro:content'
import { Feed } from 'feed'
import { base, defaultLocale, themeConfig } from '@/config'
import { getPostPath } from '@/i18n/path'
import { ui } from '@/i18n/ui'
import { getPostDescription } from '@/utils/description'
import { sanitizeFeedHtml } from '@/utils/feedSanitize'

const { title, description, i18nTitle, url, author } = themeConfig.site
const { follow } = themeConfig.seo ?? {}

/**
 * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 * Generate a feed object supporting both RSS and Atom formats
 *
 * @param options Feed generation options
 * @param options.lang Optional language code
 * @returns A Feed instance ready for RSS or Atom output
 */
export async function generateFeed({ lang }: { lang?: Language } = {}) {
  const currentUI = ui[lang as keyof typeof ui] ?? ui[defaultLocale as keyof typeof ui] ?? {}
  const siteURL = lang ? `${url}${base}/${lang}/` : `${url}${base}/`

  // Create Feed instance
  const feed = new Feed({
    title: i18nTitle ? currentUI.title : title,
    description: i18nTitle ? currentUI.description : description,
    id: siteURL,
    link: siteURL,
    language: lang ?? themeConfig.global.locale,
    copyright: `Copyright © ${new Date().getFullYear()} ${author}`,
    updated: new Date(),
    generator: 'Astro-Theme-Retypeset with Feed for Node.js',

    feedLinks: {
      rss: new URL(lang ? `${base}/${lang}/rss.xml` : `${base}/rss.xml`, url).toString(),
      atom: new URL(lang ? `${base}/${lang}/atom.xml` : `${base}/atom.xml`, url).toString(),
    },

    author: {
      name: author,
      link: `${url}${base}/`,
    },
  })

  // Filter posts by language and exclude drafts
  const [darknessPosts, emileMosellyPosts] = await Promise.all([
    getCollection(
      'darkness',
      ({ data }: { data: CollectionEntry<'darkness'>['data'] }) => {
        const isNotDraft = !data.draft
        const isCorrectLang = data.lang === lang
          || data.lang === ''
          || (lang === undefined && data.lang === defaultLocale)

        return isNotDraft && isCorrectLang
      },
    ),
    getCollection(
      'emileMoselly',
      ({ data }: { data: CollectionEntry<'emileMoselly'>['data'] }) => {
        const isNotDraft = !data.draft
        const isCorrectLang = data.lang === lang
          || data.lang === ''
          || (lang === undefined && data.lang === defaultLocale)

        return isNotDraft && isCorrectLang
      },
    ),
  ])

  const allPosts = [
    ...darknessPosts.map(post => ({ ...post, collection: 'darkness' as const })),
    ...emileMosellyPosts.map(post => ({ ...post, collection: 'emileMoselly' as const })),
  ]
  // Sort posts by published date in descending order and limit to the latest 25
  const recentPosts = allPosts
    .sort((a, b) => new Date(b.data.published).getTime() - new Date(a.data.published).getTime())
    .slice(0, 25)

  // Only the MDX renderer is registered: @astrojs/markdoc exposes no getContainerRenderer.
  // .mdoc entries still render through render(post) (Astro components), but the container may lack a Markdoc renderer.
  const renderers = await loadRenderers([getMDXRenderer()])
  const container = await AstroContainer.create({ renderers })

  // Add posts to feed
  for (const post of recentPosts) {
    const slug = post.data.abbrlink || post.id
    const path = getPostPath(slug, (post.data.lang || defaultLocale) as Language, post.collection)
    const link = new URL(path, `${url}${base}/`).toString()

    const postContent = await renderPostContent(post, container, link)

    // publishDate -> Atom:<published>, RSS:<pubDate>
    const publishDate = new Date(post.data.published)
    // updateDate -> Atom:<updated>, RSS has no update tag
    const updateDate = post.data.updated ? new Date(post.data.updated) : publishDate

    feed.addItem({
      title: post.data.title,
      id: link,
      link,
      description: getPostDescription(post, 'feed'),
      content: postContent,
      author: [{
        name: author,
        link: `${url}${base}/`,
      }],
      published: publishDate,
      date: updateDate,
    })
  }

  // Add follow verification if available
  if (follow?.feedID && follow?.userID) {
    feed.addExtension({
      name: 'follow_challenge',
      objects: {
        feedId: follow.feedID,
        userId: follow.userID,
      },
    })
  }

  return feed
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Generate RSS 2.0 format feed
export async function generateRSS(context: APIContext) {
  const feed = await generateFeed({
    lang: context.params?.lang as Language | undefined,
  })

  // Add XSLT stylesheet to RSS feed
  let rssXml = feed.rss2()
  rssXml = rssXml.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    `<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet href="${base}/feeds/rss-style.xsl" type="text/xsl"?>`,
  )

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

// Generate Atom 1.0 format feed
export async function generateAtom(context: APIContext) {
  const feed = await generateFeed({
    lang: context.params?.lang as Language | undefined,
  })

  // Add XSLT stylesheet to Atom feed
  let atomXml = feed.atom1()
  atomXml = atomXml.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    `<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet href="${base}/feeds/atom-style.xsl" type="text/xsl"?>`,
  )

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  })
}

// Render one post to sanitized HTML; a failure yields empty content instead of aborting the feed
async function renderPostContent(
  post: Parameters<typeof render>[0],
  container: AstroContainer,
  link: string,
) {
  try {
    const { Content } = await render(post)
    return sanitizeFeedHtml(await container.renderToString(Content), url)
  }
  catch (error) {
    console.warn(`[feed] Failed to render ${link}; using empty content.`, error)
    return ''
  }
}
