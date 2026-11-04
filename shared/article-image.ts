// shared/article-image.ts
export type ImageOrientation = 'none' | 'landscape' | 'portrait'

export interface ArticleImageProps {
  src: string
  alt: string
  orientation: ImageOrientation
  hideCaption: boolean
}

export const MEDIA_HOST = 'https://cdn.chenin.fr'

// Collection, then one or more [a-z0-9-]+ segments. Subfolders are allowed; "..", empty segments, and capitals are not.
const KEY_RE = /^(darkness|emileMoselly)\/((?:[a-z0-9-]+\/)*[a-z0-9-]+)\.jpg$/

export function parseArticleImageKey(
  src: string,
): { collection: 'darkness' | 'emileMoselly', file: string } | null {
  const match = KEY_RE.exec(src)
  if (!match)
    return null
  return {
    collection: match[1] as 'darkness' | 'emileMoselly',
    file: `${match[2]}.jpg`,
  }
}
