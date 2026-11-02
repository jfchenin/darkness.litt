// admin/src/lib/jpeg-upload.ts
import { MAX_JPEG_BYTES, parseArticleImageKey } from '../../../shared/article-image'

// Checks the JPEG SOI marker (FF D8 FF) so a renamed file is not stored as image/jpeg.
export function isJpegMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
}

// Validates key shape, JPEG magic bytes and size before an R2 upload.
export function assertUploadableJpeg(
  key: string,
  bytes: Uint8Array,
): { ok: true } | { ok: false, status: number, error: string } {
  if (!parseArticleImageKey(key)) {
    return { ok: false, status: 400, error: 'invalid key' }
  }
  if (!isJpegMagic(bytes)) {
    return { ok: false, status: 400, error: 'not jpeg' }
  }
  if (bytes.byteLength > MAX_JPEG_BYTES) {
    return { ok: false, status: 400, error: 'too large' }
  }
  return { ok: true }
}
