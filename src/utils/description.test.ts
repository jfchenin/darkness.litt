// src/utils/description.test.ts
import type { CollectionEntry } from 'astro:content'
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { getPostDescription } from './description'

function createPost(body: string) {
  return { body, data: { lang: 'fr', description: '' } } as unknown as CollectionEntry<'darkness'>
}

describe('getPostDescription', () => {
  it('keeps Markdoc articleImage tags out of the excerpt', () => {
    const body = [
      'Premier paragraphe.',
      '',
      '{% articleImage',
      '   src="darkness/couverture-1.jpg"',
      '   alt="Légende"',
      '   orientation="none"',
      '   hideCaption=false',
      '/%}',
      '',
      'Suite du texte.',
    ].join('\n')

    const description = getPostDescription(createPost(body), 'meta')

    assert.equal(description.includes('{%'), false)
    assert.equal(description.includes('articleImage'), false)
    assert.equal(description.includes('darkness/couverture-1.jpg'), false)
    assert.match(description, /Premier paragraphe\./)
    assert.match(description, /Suite du texte\./)
  })
})
