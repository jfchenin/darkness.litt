// scripts/apply-lqip.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { applyLqipStyleToHtml } from './apply-lqip.ts'

describe('applyLqipStyleToHtml', () => {
  it('preserves figure markup and sets --lqip on img', () => {
    const html = '<figure data-orientation="portrait"><img src="/_astro/a.webp"><figcaption>Légende</figcaption></figure>'
    const { html: out, applied } = applyLqipStyleToHtml(html, { '/_astro/a.webp': 'deadbeef' })

    assert.equal(applied, 1)
    assert.match(out, /<figure[^>]*data-orientation="portrait"/)
    assert.match(out, /<figcaption>Légende<\/figcaption>/)
    assert.match(out, /<img[^>]*style="[^"]*--lqip:#deadbeef/)
  })

  it('does not re-apply when --lqip already present', () => {
    const html = '<img src="/_astro/a.webp" style="--lqip:#deadbeef">'
    const { applied } = applyLqipStyleToHtml(html, { '/_astro/a.webp': 'deadbeef' })
    assert.equal(applied, 0)
  })
})
