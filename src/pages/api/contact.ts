/**
 * Contact Form API Endpoint
 * Handles form submission with Botpoison verification
 * Compatible with Cloudflare Workers/Pages
 */

import type { APIRoute } from 'astro'

// Disable prerendering for this API endpoint
export const prerender = false

interface BotpoisonVerifyResponse {
  ok: boolean
  message?: string
}

interface ContactFormData {
  fullName: string
  email: string
  message?: string
  consent: boolean
  newsletterConsent?: boolean
  _botpoison: string
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json() as ContactFormData

    // Validate required fields
    if (!body.fullName || !body.email || !body.consent) {
      return new Response(
        JSON.stringify({
          error: 'Champs requis manquants',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Validate Botpoison solution is present
    if (!body._botpoison) {
      return new Response(
        JSON.stringify({
          error: 'Vérification anti-bot manquante',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Get secret key from environment
    const secretKey = import.meta.env.BOTPOISON_SECRET_KEY

    if (!secretKey) {
      console.error('BOTPOISON_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({
          error: 'Configuration serveur incorrecte',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Verify Botpoison solution using REST API
    const botpoisonResponse = await fetch('https://api.botpoison.com/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretKey,
        solution: body._botpoison,
      }),
    })

    const botpoisonData: BotpoisonVerifyResponse = await botpoisonResponse.json()

    // Check if verification failed
    if (!botpoisonData.ok) {
      console.warn('Botpoison verification failed:', botpoisonData.message)
      return new Response(
        JSON.stringify({
          error: 'Vérification anti-bot échouée',
          details: botpoisonData.message,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Botpoison verification succeeded, now forward to Formspark
    const formsparkId = import.meta.env.PUBLIC_FORMSPARK_FORM_ID
    if (!formsparkId) {
      console.error('PUBLIC_FORMSPARK_FORM_ID not configured')
      return new Response(
        JSON.stringify({
          error: 'Configuration formulaire incorrecte',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Prepare data for Formspark (exclude _botpoison)
    const formsparkData = {
      fullName: body.fullName,
      email: body.email,
      message: body.message || '',
      consent: body.consent,
      newsletterConsent: body.newsletterConsent || false,
    }

    // Submit to Formspark
    const formsparkResponse = await fetch(formsparkId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(formsparkData),
    })

    if (!formsparkResponse.ok) {
      const errorText = await formsparkResponse.text()
      console.error('Formspark submission failed:', errorText)
      return new Response(
        JSON.stringify({
          error: 'Échec de l\'envoi du formulaire',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Success!
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message envoyé avec succès',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
  catch (error) {
    console.error('Contact form API error:', error)
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur interne',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
