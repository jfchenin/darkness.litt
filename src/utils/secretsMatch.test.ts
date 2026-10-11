// src/utils/secretsMatch.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { secretsMatch } from './secretsMatch.ts'

describe('secretsMatch', () => {
  it('accepts an equal secret', () => {
    assert.equal(secretsMatch('abc123', 'abc123'), true)
  })

  it('rejects a different secret of the same length', () => {
    assert.equal(secretsMatch('abc124', 'abc123'), false)
  })

  it('rejects a different length', () => {
    assert.equal(secretsMatch('abc', 'abc123'), false)
  })

  it('rejects an empty provided value', () => {
    assert.equal(secretsMatch('', 'abc123'), false)
  })
})
