// src/pages/api/contact.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { handleContactPost } from './contact.ts'

const FORMSPARK_URL = 'https://submit-form.com/test-form'
const ENV = {
  BOTPOISON_SECRET_KEY: 'server-secret',
  PUBLIC_FORMSPARK_FORM_ID: FORMSPARK_URL,
}

function makeRequest(body: unknown): Request {
  return new Request('https://darkness.chenin.fr/api/contact/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Char René',
    email: 'rchar@poesie.fr',
    consent: true,
    _botpoison: 'valid-solution',
    ...overrides,
  }
}

describe('handleContactPost', () => {
  it('rejects SERVICE_UNAVAILABLE when Botpoison returns ok false', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('botpoison.com')) {
        return Response.json({ ok: false, message: 'bad token internals' })
      }
      return new Response('ok', { status: 200 })
    }

    const response = await handleContactPost(
      makeRequest(validBody({ _botpoison: 'SERVICE_UNAVAILABLE' })),
      ENV,
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 403)
    const text = await response.text()
    assert.equal(text, JSON.stringify({ error: 'Vérification anti-bot échouée' }))
    assert.ok(!text.includes('bad token internals'))
    assert.ok(!text.includes('details'))
    assert.ok(!calls.some(url => url.includes('submit-form.com')))
  })

  it('rejects a missing Botpoison solution with 400', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleContactPost(
      makeRequest(validBody({ _botpoison: '' })),
      ENV,
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'Vérification anti-bot manquante' })
    assert.equal(calls.length, 0)
  })

  it('returns 503 when Botpoison verify fetch throws', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('botpoison.com')) {
        throw new Error('network down https://api.botpoison.com/verify with secretKey')
      }
      return new Response('ok', { status: 200 })
    }

    const response = await handleContactPost(
      makeRequest(validBody()),
      ENV,
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'Vérification anti-bot indisponible' })
    assert.ok(!calls.some(url => url.includes('submit-form.com')))
  })

  it('forwards to Formspark when Botpoison ok is true', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('botpoison.com')) {
        return Response.json({ ok: true })
      }
      return new Response('ok', { status: 200 })
    }

    const response = await handleContactPost(
      makeRequest(validBody()),
      ENV,
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 200)
    assert.ok(calls.includes(FORMSPARK_URL))
  })

  it('returns 500 without details when the request body is invalid JSON', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleContactPost(
      makeRequest('not-json{'),
      ENV,
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 500)
    const body = await response.json() as Record<string, unknown>
    assert.deepEqual(body, { error: 'Erreur serveur interne' })
    assert.equal('details' in body, false)
    assert.equal(calls.length, 0)
  })
})
