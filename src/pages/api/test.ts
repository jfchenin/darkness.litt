/**
 * Test API Endpoint
 * Simple endpoint to verify API routes are working
 * Access at: http://localhost:4321/api/test
 */

import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'API endpoint is working!',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}))

  return new Response(
    JSON.stringify({
      success: true,
      message: 'POST request received',
      receivedData: body,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}
