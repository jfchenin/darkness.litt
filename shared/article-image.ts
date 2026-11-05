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
// `emile-moselly` is the public R2 prefix; `emileMoselly` remains accepted.
export const KEY_RE = /^(darkness|emileMoselly|emile-moselly)\/((?:[a-z0-9-]+\/)*[a-z0-9-]+)\.jpg$/

/** Accept a bucket key and return its collection plus the path after the prefix. */
export function parseArticleImageKey(
  src: string,
): { collection: 'darkness' | 'emileMoselly', file: string } | null {
  const match = KEY_RE.exec(src)
  if (!match)
    return null
  return {
    collection: match[1] === 'darkness' ? 'darkness' : 'emileMoselly',
    file: `${match[2]}.jpg`,
  }
}
