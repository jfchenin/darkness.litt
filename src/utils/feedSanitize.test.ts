// src/utils/feedSanitize.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { test } from 'node:test'
import { sanitizeFeedHtml } from './feedSanitize'

const site = 'https://darkness.chenin.fr'

test('absolutizes root-relative src and every srcset URL, keeps sizes', () => {
  const html = '<img src="/_astro/a.webp" srcset="/_astro/a_720.webp 720w, /_astro/a_1200.webp 1200w" sizes="(max-width: 768px) 100vw, 720px" alt="x">'
  const out = sanitizeFeedHtml(html, site)
  assert.match(out, /src="https:\/\/darkness\.chenin\.fr\/_astro\/a\.webp"/)
  assert.match(out, /srcset="https:\/\/darkness\.chenin\.fr\/_astro\/a_720\.webp 720w, https:\/\/darkness\.chenin\.fr\/_astro\/a_1200\.webp 1200w"/)
  assert.match(out, /sizes="\(max-width: 768px\) 100vw, 720px"/)
})

test('leaves absolute and protocol-relative URLs untouched', () => {
  const out = sanitizeFeedHtml('<img src="//cdn.example/a.png" srcset="https://x.test/a.png 1x, //cdn.example/b.png 2x">', site)
  assert.match(out, /src="\/\/cdn\.example\/a\.png"/)
  assert.match(out, /srcset="https:\/\/x\.test\/a\.png 1x, \/\/cdn\.example\/b\.png 2x"/)
})
