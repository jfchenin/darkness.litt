// shared/article-image.ts
export type ImageOrientation = 'none' | 'landscape' | 'portrait'

export interface ArticleImageProps {
  src: string
  alt: string
  orientation: ImageOrientation
  hideCaption: boolean
}

export const MEDIA_HOST = 'https://media.darkness.chenin.fr'
export const MAX_JPEG_BYTES = 20 * 1024 * 1024

const KEY_RE = /^(darkness|emileMoselly)\/([a-z0-9-]+)\.jpg$/

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
