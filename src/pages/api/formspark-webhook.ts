/**
 * Formspark Webhook Endpoint
 * Receives form submissions from Formspark and adds contacts to Brevo
 * when newsletter consent is given
 *
 * Flow:
 * 1. Contact form submits to /api/contact
 * 2. /api/contact verifies Botpoison and forwards to Formspark
 * 3. Formspark sends webhook to this endpoint
 * 4. If newsletterConsent = true, add contact to Brevo
 *
 * Compatible with Cloudflare Workers/Pages
 */

import type { APIRoute } from 'astro'

export const prerender = false

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

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse incoming Formspark webhook data
    const formData = await request.json() as FormsparkWebhookData

    // Validate that we have at least an email
    if (!formData.email) {
      console.error('Webhook received without email')
      return new Response(
        JSON.stringify({ error: 'Invalid data: email required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if user consented to newsletter
    // Handle both boolean and string values from form submissions
    const hasNewsletterConsent
      = formData.newsletterConsent === true
        || formData.newsletterConsent === 'true'
        || formData.newsletterConsent === 'on'

    if (!hasNewsletterConsent) {
      // No newsletter consent, just acknowledge receipt
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook received, no newsletter subscription requested',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Newsletter consent given, add to Brevo
    const brevoApiKey = import.meta.env.BREVO_API_KEY
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured')
      return new Response(
        JSON.stringify({
          error: 'Brevo configuration missing',
          received: true,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Get Brevo list ID (default to 2, or configure via env var)
    const brevoListId = import.meta.env.BREVO_LIST_ID
      ? Number.parseInt(import.meta.env.BREVO_LIST_ID, 10)
      : 6

    // Prepare Brevo contact payload
    const brevoPayload: BrevoContactPayload = {
      email: formData.email,
      listIds: [brevoListId],
      updateEnabled: true,
      attributes: {},
    }

    // Add first name if available
    if (formData.fullName) {
      // Extract first name (before first space)
      const firstName = formData.fullName.split(' ')[0]
      brevoPayload.attributes.FIRSTNAME = firstName
    }

    // Submit to Brevo
    try {
      const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      })

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text()
        console.error('Brevo API error:', brevoResponse.status, errorText)

        // Check if contact already exists (204 or specific error)
        if (brevoResponse.status === 204 || errorText.includes('already exists')) {
          console.warn('Contact already exists in Brevo:', formData.email)
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Contact already subscribed to newsletter',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        return new Response(
          JSON.stringify({
            error: 'Failed to add contact to newsletter',
            details: errorText,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const brevoData = await brevoResponse.json()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Contact added to newsletter',
          brevoId: brevoData.id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
    catch (brevoError) {
      console.error('Brevo request failed:', brevoError)
      return new Response(
        JSON.stringify({
          error: 'Failed to connect to newsletter service',
          details: brevoError instanceof Error ? brevoError.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }
  catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
