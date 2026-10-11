/**
 * Formspark Webhook Endpoint
 * Receives form submissions from Formspark and adds contacts to Brevo
 * when newsletter consent is given.
 *
 * Formspark cannot set custom headers on webhooks, so the shared secret
 * is the `secret` query parameter on the webhook URL configured in Formspark.
 *
 * Flow:
 * 1. Contact form submits to /api/contact
 * 2. /api/contact verifies Botpoison and forwards to Formspark
 * 3. Formspark sends webhook to this endpoint with ?secret=
 * 4. If newsletterConsent = true, add contact to Brevo
 *
 * Compatible with Cloudflare Workers/Pages
 */

import type { APIRoute } from 'astro'
import { secretsMatch } from '@/utils/secretsMatch'

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

/** Handle a Formspark webhook POST after authenticating the query secret. */
export async function handleFormsparkWebhook(
  request: Request,
  env: WebhookEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const configuredSecret = env.FORMSPARK_WEBHOOK_SECRET
  const providedSecret = new URL(request.url).searchParams.get('secret') ?? ''
  if (!configuredSecret || !secretsMatch(providedSecret, configuredSecret)) {
    if (!configuredSecret)
      console.error('FORMSPARK_WEBHOOK_SECRET not configured')
    else
      console.error('Formspark webhook authentication failed')
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    let parsed: unknown
    try {
      parsed = await request.json()
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
