// admin/keystatic.config.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- node:test via tsx
import { describe, it } from 'node:test'
import { KEY_RE } from '../shared/article-image.ts'
import { articleImageBlock } from './keystatic.config.ts'

const IMAGE_KEY_MESSAGE = 'darkness/…jpg ou emile-moselly/…jpg'

const src = articleImageBlock.schema.src

describe('article image key in the editor', () => {
  it('accepts a bucket key the public build accepts', () => {
    for (const key of [
      'darkness/couvrecomposition.jpg',
      'emileMoselly/portrait-1.jpg',
      'emile-moselly/plaque-em.jpg',
      'darkness/everglade/everglades-7.jpg',
    ]) {
      assert.equal(KEY_RE.test(key), true)
      assert.equal(src.validate(key, undefined), key)
    }
  })

  it('rejects a key the public build throws on', () => {
    for (const key of [
      'darkness/a.png',
      'darkness/../x.jpg',
      'posts/a.jpg',
      'darkness/A.jpg',
      '',
    ]) {
      assert.equal(KEY_RE.test(key), false)
      assert.throws(
        () => src.validate(key, undefined),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.equal(error.message, key === '' ? 'Clé R2 must not be empty' : IMAGE_KEY_MESSAGE)
          return true
        },
      )
    }
  })
})
