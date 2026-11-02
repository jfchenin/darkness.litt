// admin/src/lib/jpeg-upload.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- node:test via tsx
import { describe, it } from 'node:test'
import { MAX_JPEG_BYTES } from '../../../shared/article-image.ts'
import { assertUploadableJpeg, isJpegMagic } from './jpeg-upload.ts'

const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])

describe('isJpegMagic', () => {
  it('accepts the FF D8 FF prefix', () => {
    assert.equal(isJpegMagic(jpegBytes), true)
  })

  it('rejects other prefixes and short input', () => {
    assert.equal(isJpegMagic(new Uint8Array([0x89, 0x50, 0x4E, 0x47])), false)
    assert.equal(isJpegMagic(new Uint8Array([0xFF, 0xD8])), false)
    assert.equal(isJpegMagic(new Uint8Array()), false)
  })
})

describe('assertUploadableJpeg', () => {
  it('accepts a valid key and jpeg bytes', () => {
    assert.deepEqual(assertUploadableJpeg('darkness/photo-1.jpg', jpegBytes), { ok: true })
  })

  it('rejects an invalid key', () => {
    assert.deepEqual(assertUploadableJpeg('posts/photo.jpg', jpegBytes), {
      ok: false,
      status: 400,
      error: 'invalid key',
    })
  })

  it('rejects non-jpeg bytes', () => {
    assert.deepEqual(assertUploadableJpeg('darkness/photo.jpg', new Uint8Array([1, 2, 3])), {
      ok: false,
      status: 400,
      error: 'not jpeg',
    })
  })

  it('rejects oversized files', () => {
    const oversized = new Uint8Array(MAX_JPEG_BYTES + 1)
    oversized.set(jpegBytes)
    assert.deepEqual(assertUploadableJpeg('emileMoselly/photo.jpg', oversized), {
      ok: false,
      status: 400,
      error: 'too large',
    })
  })
})
