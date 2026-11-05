/**
 * Formspark Webhook Endpoint
 * Receives form submissions from Formspark and adds contacts to Brevo
 * when newsletter consent is given.
 *
 * Formspark's webhook settings store a URL only. With "Sign deliveries"
 * on, each POST carries Formspark-Timestamp and Formspark-Signature
 * (`v1=` plus HMAC-SHA256 of `${timestamp}.${rawBody}`). A `secret`
 * query parameter is rejected so the credential is not the request URL.
 *
 * Flow:
 * 1. Contact form submits to /api/contact
 * 2. /api/contact verifies Botpoison and forwards to Formspark
 * 3. Formspark signs the webhook and posts it here
 * 4. If newsletterConsent = true, add contact to Brevo
 *
 * Compatible with Cloudflare Workers/Pages
 */

import type { APIRoute } from 'astro'
import { createHmac } from 'node:crypto'
import { secretsMatch } from '@/utils/secretsMatch'

/** Formspark asks receivers to reject timestamps more than a few minutes old. */
const SIGNATURE_MAX_SKEW_SECONDS = 5 * 60

export const prerender = false

export interface WebhookEnv {
  FORMSPARK_WEBHOOK_SECRET?: string
  BREVO_API_KEY?: string
  BREVO_LIST_ID?: string
}

interface FormsparkWebhookData {
  email: string
  fullName?: string
  message?: string
  consent?: boolean
  newsletterConsent?: boolean | string
  [key: string]: unknown
}

interface BrevoContactPayload {
  email: string
  listIds: number[]
  updateEnabled: boolean
  attributes: {
    FIRSTNAME?: string
    [key: string]: unknown
  }
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function unauthorized(): Response {
  return json({ error: 'Unauthorized' }, 401)
}

/** Build the Formspark-Signature value for one raw webhook body. */
function expectedSignature(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  return `v1=${digest}`
}

/** Return true when the timestamp is within the allowed skew of now. */
function timestampIsFresh(timestamp: string, nowMs: number): boolean {
  if (!/^\d+$/.test(timestamp))
    return false
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds))
    return false
  const skew = Math.abs(Math.floor(nowMs / 1000) - timestampSeconds)
  return skew <= SIGNATURE_MAX_SKEW_SECONDS
}

/** Handle a Formspark webhook POST after verifying Formspark-Signature. */
export async function handleFormsparkWebhook(
  request: Request,
  env: WebhookEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (new URL(request.url).searchParams.has('secret')) {
    console.error('Formspark webhook rejected query secret')
    return unauthorized()
  }

  const configuredSecret = env.FORMSPARK_WEBHOOK_SECRET
  if (!configuredSecret) {
    console.error('FORMSPARK_WEBHOOK_SECRET not configured')
    return unauthorized()
  }

  const signature = request.headers.get('Formspark-Signature') ?? ''
  const timestamp = request.headers.get('Formspark-Timestamp') ?? ''
  if (!signature || !timestampIsFresh(timestamp, Date.now())) {
    console.error('Formspark webhook authentication failed')
    return unauthorized()
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  }
  catch {
    console.error('Formspark webhook payload invalid')
    return json({ error: 'Invalid data' }, 400)
  }

  if (!secretsMatch(signature, expectedSignature(configuredSecret, timestamp, rawBody))) {
    console.error('Formspark webhook authentication failed')
    return unauthorized()
  }

  try {
    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody)
    }
    catch {
      console.error('Formspark webhook payload invalid')
      return json({ error: 'Invalid data' }, 400)
    }

    if (
      typeof parsed !== 'object'
      || parsed === null
      || Array.isArray(parsed)
      || typeof (parsed as FormsparkWebhookData).email !== 'string'
      || !(parsed as FormsparkWebhookData).email
    ) {
      console.error('Formspark webhook payload invalid')
      return json({ error: 'Invalid data' }, 400)
    }

    const formData = parsed as FormsparkWebhookData

    // Check if user consented to newsletter
    // Handle both boolean and string values from form submissions
    const hasNewsletterConsent
      = formData.newsletterConsent === true
        || formData.newsletterConsent === 'true'
        || formData.newsletterConsent === 'on'

    if (!hasNewsletterConsent) {
      return json({
        success: true,
        message: 'Webhook received, no newsletter subscription requested',
      }, 200)
    }

    const brevoApiKey = env.BREVO_API_KEY
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured')
      return json({
        error: 'Brevo configuration missing',
        received: true,
      }, 500)
    }

    const brevoListId = env.BREVO_LIST_ID
      ? Number.parseInt(env.BREVO_LIST_ID, 10)
      : 6

    const brevoPayload: BrevoContactPayload = {
      email: formData.email,
      listIds: [brevoListId],
      updateEnabled: true,
      attributes: {},
    }

    if (formData.fullName) {
      const firstName = formData.fullName.split(' ')[0]
      brevoPayload.attributes.FIRSTNAME = firstName
    }

    try {
      const brevoResponse = await fetchImpl('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      })

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text()
        console.error('Brevo API error')

        if (brevoResponse.status === 204 || errorText.includes('already exists')) {
          console.warn('Contact already exists in Brevo')
          return json({
            success: true,
            message: 'Contact already subscribed to newsletter',
          }, 200)
        }

        return json({
          error: 'Failed to add contact to newsletter',
        }, 500)
      }

      const brevoData = await brevoResponse.json() as { id?: unknown }

      return json({
        success: true,
        message: 'Contact added to newsletter',
        brevoId: brevoData.id,
      }, 200)
    }
    catch {
      console.error('Brevo request failed')
      return json({
        error: 'Failed to connect to newsletter service',
      }, 500)
    }
  }
  catch {
    console.error('Webhook processing error')
    return json({
      error: 'Internal server error',
    }, 500)
  }
}

export const POST: APIRoute = async ({ request }) => {
  return handleFormsparkWebhook(request, import.meta.env)
}
