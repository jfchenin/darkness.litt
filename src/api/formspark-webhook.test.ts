// src/pages/api/formspark-webhook.test.ts
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { handleFormsparkWebhook } from './formspark-webhook.ts'

const SECRET = 'test-webhook-secret-value'
const BASE_URL = 'https://darkness.chenin.fr/api/formspark-webhook/'

function makeRequest(secret: string | null, body: unknown): Request {
  const url = secret === null
    ? BASE_URL
    : `${BASE_URL}?secret=${encodeURIComponent(secret)}`
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('handleFormsparkWebhook', () => {
  it('rejects a missing secret query with 401', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(null, { email: 'a@b.co', newsletterConsent: true }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects a wrong secret with 401', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest('wrong-secret', { email: 'a@b.co', newsletterConsent: true }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects when FORMSPARK_WEBHOOK_SECRET is undefined', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest('anything', { email: 'a@b.co', newsletterConsent: true }),
      { BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects when FORMSPARK_WEBHOOK_SECRET is empty', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest('anything', { email: 'a@b.co', newsletterConsent: true }),
      { FORMSPARK_WEBHOOK_SECRET: '', BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('acknowledges without Brevo when newsletterConsent is absent', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(SECRET, { email: 'a@b.co' }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 200)
    const body = await response.json() as { success: boolean }
    assert.equal(body.success, true)
    assert.equal(calls.length, 0)
  })

  it('does not echo Brevo error details on failure', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('provider blew up: key sk_live_secret', { status: 500 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(SECRET, { email: 'a@b.co', newsletterConsent: true }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 500)
    const text = await response.text()
    assert.equal(calls.length, 1)
    assert.equal(calls[0], 'https://api.brevo.com/v3/contacts')
    assert.ok(!text.includes('sk_live_secret'))
    assert.ok(!text.includes('provider blew up'))
    assert.ok(!text.includes('details'))
  })

  it('rejects an empty object with 400', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(SECRET, {}),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'Invalid data' })
    assert.equal(calls.length, 0)
  })

  it('rejects invalid JSON with 400 and no details', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(SECRET, 'not-json{'),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 400)
    const body = await response.json() as Record<string, unknown>
    assert.deepEqual(body, { error: 'Invalid data' })
    assert.equal('details' in body, false)
    assert.equal(calls.length, 0)
  })
})
