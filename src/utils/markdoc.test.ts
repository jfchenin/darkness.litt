// src/utils/markdoc.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { estimateReadingMinutes, stripMarkdocTags } from './markdoc'

describe('stripMarkdocTags', () => {
  it('removes self-closing and paired multiline tags', () => {
    const text = 'a {% articleImage\n src="x.jpg"\n/%} b {% note %}c{% /note %}'
    assert.equal(stripMarkdocTags(text).replace(/\s+/g, ' ').trim(), 'a b c')
  })
})

describe('estimateReadingMinutes', () => {
  it('returns at least 1 minute for empty or tag-only bodies', () => {
    assert.equal(estimateReadingMinutes(''), 1)
    assert.equal(estimateReadingMinutes('{% articleImage src="darkness/a.jpg" alt="x" /%}'), 1)
  })

  it('rounds words / 200 and ignores Markdoc tags', () => {
    const words = Array.from({ length: 1000 }, () => 'mot').join(' ')
    const body = `${words}\n\n{% articleImage src="darkness/a-b.jpg" alt="${words}" /%}`
    assert.equal(estimateReadingMinutes(body), 5)
  })
})
