/**
 * Botpoison Challenge Generation Endpoint
 * Generates Botpoison challenges on the backend to avoid CORS issues
 */

import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = async () => {
  try {
    const publicKey = import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY

    if (!publicKey) {
      console.error('PUBLIC_BOTPOISON_PUBLIC_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Bot protection not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Generate challenge from backend (avoids CORS)
    const challengeResponse = await fetch('https://api.botpoison.com/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey }),
    })

    if (!challengeResponse.ok) {
      const errorText = await challengeResponse.text()
      console.error('Botpoison challenge failed:', {
        status: challengeResponse.status,
        error: errorText,
      })

      return new Response(
        JSON.stringify({
          error: 'Challenge generation failed',
          status: challengeResponse.status,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const challenge = await challengeResponse.json()

    return new Response(
      JSON.stringify(challenge),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
  catch (error) {
    console.error('Backend challenge error:', error)
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
