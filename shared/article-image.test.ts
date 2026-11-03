// shared/article-image.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- node:test via tsx
import { describe, it } from 'node:test'
import { parseArticleImageKey } from './article-image.ts'

describe('parseArticleImageKey', () => {
  it('accepts darkness and emileMoselly jpg keys', () => {
    assert.deepEqual(parseArticleImageKey('darkness/couvrecomposition.jpg'), {
      collection: 'darkness',
      file: 'couvrecomposition.jpg',
    })
    assert.deepEqual(parseArticleImageKey('emileMoselly/portrait-1.jpg'), {
      collection: 'emileMoselly',
      file: 'portrait-1.jpg',
    })
  })

  it('rejects bad keys', () => {
    assert.equal(parseArticleImageKey('darkness/../x.jpg'), null)
    assert.equal(parseArticleImageKey('darkness/a/b.jpg'), null)
    assert.equal(parseArticleImageKey('posts/a.jpg'), null)
    assert.equal(parseArticleImageKey('darkness/a.png'), null)
    assert.equal(parseArticleImageKey('darkness/A.jpg'), null)
    assert.equal(parseArticleImageKey(''), null)
  })
})
