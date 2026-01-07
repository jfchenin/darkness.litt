/**
 * Debug Endpoint
 * Shows which environment variables are configured
 * REMOVE THIS FILE AFTER DEBUGGING!
 */

import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async () => {
  const envCheck = {
    PUBLIC_BOTPOISON_PUBLIC_KEY: {
      exists: !!import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY,
      prefix: import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY?.substring(0, 3) || 'N/A',
      length: import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY?.length || 0,
    },
    BOTPOISON_SECRET_KEY: {
      exists: !!import.meta.env.BOTPOISON_SECRET_KEY,
      prefix: import.meta.env.BOTPOISON_SECRET_KEY?.substring(0, 3) || 'N/A',
      length: import.meta.env.BOTPOISON_SECRET_KEY?.length || 0,
    },
    PUBLIC_FORMSPARK_FORM_ID: {
      exists: !!import.meta.env.PUBLIC_FORMSPARK_FORM_ID,
      value: import.meta.env.PUBLIC_FORMSPARK_FORM_ID?.substring(0, 30) || 'N/A',
      length: import.meta.env.PUBLIC_FORMSPARK_FORM_ID?.length || 0,
    },
  }

  return new Response(
    JSON.stringify(envCheck, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}
