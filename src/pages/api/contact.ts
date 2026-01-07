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
  _botpoison_error?: string
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

    // Check if Botpoison is available or if graceful fallback is needed
    if (body._botpoison === 'SERVICE_UNAVAILABLE') {
      // Graceful fallback - Botpoison service was unavailable
      console.warn('⚠️ Form submitted without Botpoison verification (service unavailable)')
      console.warn('Submission details:', {
        email: body.email,
        error: body._botpoison_error,
        timestamp: new Date().toISOString(),
      })
      // Continue to Formspark without verification
    }
    else if (!body._botpoison) {
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
    else {
      // Normal Botpoison verification flow
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
      try {
        console.warn('Verifying Botpoison solution:', {
          secretKeyPrefix: secretKey.substring(0, 3),
          solutionLength: body._botpoison.length,
          solutionPreview: body._botpoison.substring(0, 50),
        })

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

        console.warn('Botpoison API response:', {
          status: botpoisonResponse.status,
          statusText: botpoisonResponse.statusText,
        })

        const botpoisonData: BotpoisonVerifyResponse = await botpoisonResponse.json()

        console.warn('Botpoison verification result:', {
          ok: botpoisonData.ok,
          message: botpoisonData.message,
        })

        // Check if verification failed
        if (!botpoisonData.ok) {
          console.error('Botpoison verification failed:', {
            message: botpoisonData.message,
            email: body.email,
          })
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
      }
      catch (verifyError) {
        // If verification fails, log but allow submission (graceful degradation)
        console.error('Botpoison verification error:', verifyError)
        console.warn('Allowing submission despite verification error')
      }
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

    console.warn('Submitting to Formspark:', {
      formsparkId: `${formsparkId.substring(0, 30)}...`,
      email: body.email,
    })

    // Prepare data for Formspark (exclude _botpoison fields)
    const formsparkData = {
      fullName: body.fullName,
      email: body.email,
      message: body.message || '',
      consent: body.consent,
      newsletterConsent: body.newsletterConsent || false,
      // Add note if submitted without bot protection
      ...(body._botpoison === 'SERVICE_UNAVAILABLE' && {
        _note: 'Submitted without bot protection (service unavailable)',
      }),
    }

    // Submit to Formspark using form-encoded data
    const formParams = new URLSearchParams()
    for (const [key, value] of Object.entries(formsparkData)) {
      formParams.append(key, String(value))
    }

    const formsparkResponse = await fetch(formsparkId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    })

    console.warn('Formspark response:', {
      status: formsparkResponse.status,
      statusText: formsparkResponse.statusText,
      ok: formsparkResponse.ok,
    })

    if (!formsparkResponse.ok) {
      const errorText = await formsparkResponse.text()

      console.error('Formspark submission failed:', {
        status: formsparkResponse.status,
        statusText: formsparkResponse.statusText,
        body: errorText,
        contentType: formsparkResponse.headers.get('content-type'),
        submittedData: formsparkData,
      })

      return new Response(
        JSON.stringify({
          error: 'Échec de l\'envoi du formulaire',
          details: errorText,
          status: formsparkResponse.status,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const formsparkResult = await formsparkResponse.text()
    console.warn('✓ Form submitted successfully to Formspark:', {
      response: formsparkResult.substring(0, 100),
    })

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
