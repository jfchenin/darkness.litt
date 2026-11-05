// src/pages/api/formspark-webhook.test.ts
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
// eslint-disable-next-line test/no-import-node-test -- plan uses node:test via tsx
import { describe, it } from 'node:test'
import { handleFormsparkWebhook } from './formspark-webhook.ts'

const SECRET = 'test-webhook-secret-value'
const BASE_URL = 'https://darkness.chenin.fr/api/formspark-webhook/'

/** Build the Formspark-Signature header for a raw body. */
function sign(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  return `v1=${digest}`
}

function rawBodyOf(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body)
}

function makeRequest(
  body: unknown,
  options: {
    secret?: string
    timestamp?: string | null
    signature?: string | null
    querySecret?: string
  } = {},
): Request {
  const rawBody = rawBodyOf(body)
  const timestamp = options.timestamp === undefined
    ? String(Math.floor(Date.now() / 1000))
    : options.timestamp
  const secret = options.secret ?? SECRET
  const signature = options.signature === undefined && timestamp
    ? sign(secret, timestamp, rawBody)
    : options.signature

  const url = options.querySecret === undefined
    ? BASE_URL
    : `${BASE_URL}?secret=${encodeURIComponent(options.querySecret)}`

  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (timestamp)
    headers.set('Formspark-Timestamp', timestamp)
  if (signature)
    headers.set('Formspark-Signature', signature)

  return new Request(url, {
    method: 'POST',
    headers,
    body: rawBody,
  })
}

describe('handleFormsparkWebhook', () => {
  it('rejects a missing Formspark-Signature with 401', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest({ email: 'a@b.co', newsletterConsent: true }, { signature: null }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects a wrong signature with 401', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest({ email: 'a@b.co', newsletterConsent: true }, { signature: 'v1=deadbeef' }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects a query secret even when it matches', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(
        { email: 'a@b.co', newsletterConsent: true },
        { signature: null, querySecret: SECRET },
      ),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects a query secret even when the signature is valid', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest(
        { email: 'a@b.co', newsletterConsent: true },
        { querySecret: SECRET },
      ),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
    assert.equal(calls.length, 0)
  })

  it('rejects a signature that does not match the raw body', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const timestamp = String(Math.floor(Date.now() / 1000))
    const response = await handleFormsparkWebhook(
      makeRequest(
        { email: 'a@b.co', newsletterConsent: true },
        { timestamp, signature: sign(SECRET, timestamp, '{"email":"other@b.co"}') },
      ),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.equal(calls.length, 0)
  })

  it('rejects a timestamp older than a few minutes', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const timestamp = String(Math.floor(Date.now() / 1000) - 10 * 60)
    const response = await handleFormsparkWebhook(
      makeRequest({ email: 'a@b.co', newsletterConsent: true }, { timestamp }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 401)
    assert.equal(calls.length, 0)
  })

  it('rejects when FORMSPARK_WEBHOOK_SECRET is undefined', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest({ email: 'a@b.co', newsletterConsent: true }),
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
      makeRequest({ email: 'a@b.co', newsletterConsent: true }),
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
      makeRequest({ email: 'a@b.co' }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 200)
    const body = await response.json() as { success: boolean }
    assert.equal(body.success, true)
    assert.equal(calls.length, 0)
  })

  it('accepts a signature a few minutes old', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('ok', { status: 200 })
    }

    const timestamp = String(Math.floor(Date.now() / 1000) - 4 * 60)
    const response = await handleFormsparkWebhook(
      makeRequest({ email: 'a@b.co' }, { timestamp }),
      { FORMSPARK_WEBHOOK_SECRET: SECRET, BREVO_API_KEY: 'brevo-key' },
      fetchImpl as typeof fetch,
    )

    assert.equal(response.status, 200)
    assert.equal(calls.length, 0)
  })

  it('does not echo Brevo error details on failure', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('provider blew up: key sk_live_secret', { status: 500 })
    }

    const response = await handleFormsparkWebhook(
      makeRequest({ email: 'a@b.co', newsletterConsent: true }),
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
      makeRequest({}),
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
      makeRequest('not-json{'),
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
