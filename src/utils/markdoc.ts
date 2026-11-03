// src/utils/markdoc.ts
import getReadingTime from 'reading-time'

/** Remove Markdoc tags (`{% tag ... /%}`, `{% tag %}`, `{% /tag %}`), including multiline ones. */
export function stripMarkdocTags(text: string): string {
  return text.replace(/\{%[\s\S]*?%\}/g, '')
}

/**
 * Estimate reading minutes (>= 1) from a raw post body.
 * Fallback for `.mdoc`, which does not run `remarkReadingTime`.
 */
export function estimateReadingMinutes(body: string): number {
  const text = stripMarkdocTags(body).replace(/<[^>]*>/g, '')
  return Math.max(1, Math.round(getReadingTime(text).minutes))
}
