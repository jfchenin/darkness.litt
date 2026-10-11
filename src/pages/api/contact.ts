/**
 * Contact Form API Endpoint
 * Handles form submission with Botpoison verification
 * Compatible with Cloudflare Workers/Pages
 */

import type { APIRoute } from 'astro'

export const prerender = false

export interface ContactEnv {
  BOTPOISON_SECRET_KEY?: string
  PUBLIC_FORMSPARK_FORM_ID?: string
}

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
  _honeypot?: string
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Handle a contact form POST after Botpoison verification. */
export async function handleContactPost(
  request: Request,
  env: ContactEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  try {
    const body = await request.json() as ContactFormData

    // Honeypot spam check
    if (body._honeypot) {
      return json({ error: 'Invalid submission' }, 403)
    }

    // Validate required fields
    if (!body.fullName || !body.email || !body.consent) {
      return json({ error: 'Champs requis manquants' }, 400)
    }

    if (!body._botpoison) {
      return json({ error: 'Vérification anti-bot manquante' }, 400)
    }

    const secretKey = env.BOTPOISON_SECRET_KEY

    if (!secretKey) {
      console.error('BOTPOISON_SECRET_KEY not configured')
      return json({ error: 'Configuration serveur incorrecte' }, 500)
    }

    try {
      const botpoisonResponse = await fetchImpl('https://api.botpoison.com/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey,
          solution: body._botpoison,
        }),
      })

      if (!botpoisonResponse.ok) {
        console.error('Botpoison verification request failed')
        return json({ error: 'Vérification anti-bot indisponible' }, 503)
      }

      const botpoisonData: BotpoisonVerifyResponse = await botpoisonResponse.json()

      if (!botpoisonData.ok) {
        console.error('Botpoison verification failed')
        return json({ error: 'Vérification anti-bot échouée' }, 403)
      }
    }
    catch {
      console.error('Botpoison verification request failed')
      return json({ error: 'Vérification anti-bot indisponible' }, 503)
    }

    // Submit to Formspark
    const formsparkId = env.PUBLIC_FORMSPARK_FORM_ID
    if (!formsparkId) {
      console.error('PUBLIC_FORMSPARK_FORM_ID not configured')
      return json({ error: 'Configuration formulaire incorrecte' }, 500)
    }

    const formsparkData: Record<string, string | boolean> = {
      email: body.email,
      fullName: body.fullName,
      message: body.message || '',
      consent: body.consent,
      newsletterConsent: body.newsletterConsent || false,
      _gotcha: '',
    }

    const formParams = new URLSearchParams()
    for (const [key, value] of Object.entries(formsparkData)) {
      formParams.append(key, String(value))
    }

    const formsparkResponse = await fetchImpl(formsparkId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formParams.toString(),
      redirect: 'manual',
    })

    if (!formsparkResponse.ok) {
      console.error('Formspark submission failed')
      return json({
        error: 'Échec de l\'envoi du formulaire',
        status: formsparkResponse.status,
      }, 500)
    }

    return json({
      success: true,
      message: 'Message envoyé avec succès',
    }, 200)
  }
  catch {
    console.error('Contact form request failed')
    return json({
      error: 'Erreur serveur interne',
    }, 500)
  }
}

export const POST: APIRoute = async ({ request }) => {
  return handleContactPost(request, import.meta.env)
}
