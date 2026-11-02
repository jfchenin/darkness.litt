// src/utils/feedSanitize.ts
import sanitizeHtml from 'sanitize-html'

const isRootRelative = (value: string) => value.startsWith('/') && !value.startsWith('//')

/** Rewrite every root-relative URL of a `srcset` list to an absolute one. */
const absolutizeSrcset = (srcset: string, siteURL: string) =>
  srcset
    .split(',')
    .map(candidate => candidate.trim())
    .filter(Boolean)
    .map((candidate) => {
      const [candidateURL, ...descriptors] = candidate.split(/\s+/)
      const absoluteURL = isRootRelative(candidateURL)
        ? new URL(candidateURL, siteURL).toString()
        : candidateURL
      return [absoluteURL, ...descriptors].join(' ')
    })
    .join(', ')

/** Build sanitize-html options for feed content (absolute image URLs for feed readers). */
export const createFeedSanitizeOptions = (siteURL: string): sanitizeHtml.IOptions => ({
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height'],
    figure: ['class'],
  },
  // Astro emits root-relative /_astro/... paths in src and srcset
  transformTags: {
    img: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.src && isRootRelative(attribs.src) && { src: new URL(attribs.src, siteURL).toString() }),
        ...(attribs.srcset && { srcset: absolutizeSrcset(attribs.srcset, siteURL) }),
      },
    }),
  },
})

/** Sanitize rendered post HTML for use in RSS/Atom items. */
export const sanitizeFeedHtml = (html: string, siteURL: string) =>
  sanitizeHtml(html, createFeedSanitizeOptions(siteURL))
