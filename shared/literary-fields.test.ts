// shared/literary-fields.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  abbrlinkPattern,
  defaultAuthor,
  literaryFieldNames,
  proseEntries,
} from './literary-fields.ts'

describe('literary-fields', () => {
  it('exports the literary field names in order', () => {
    assert.deepEqual([...literaryFieldNames], [
      'title',
      'author',
      'published',
      'description',
      'updated',
      'tags',
      'draft',
      'pin',
      'toc',
      'lang',
      'abbrlink',
    ])
  })

  it('accepts empty and kebab abbrlinks', () => {
    assert.equal(abbrlinkPattern.test(''), true)
    assert.equal(abbrlinkPattern.test('phase1-brouillon'), true)
    assert.equal(abbrlinkPattern.test('A Renoir'), false)
    assert.equal(abbrlinkPattern.test('a_renoir'), false)
  })

  it('keeps the default author and prose paths', () => {
    assert.equal(defaultAuthor, 'JFChenin')
    assert.deepEqual([...proseEntries], [
      { collection: 'about', path: 'about/A propos' },
      { collection: 'blogroll', path: 'blogroll/blogroll-fr' },
      { collection: 'legalNotices', path: 'legalNotices/fr' },
      { collection: 'privacyPolicy', path: 'privacyPolicy/fr' },
    ])
  })
})
