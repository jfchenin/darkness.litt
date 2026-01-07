/**
 * Botpoison Utilities
 * Handles challenge generation and solving via backend
 */

/**
 * Solve a Botpoison challenge using Web Crypto API
 */
async function solveChallenge(payload: any, signature: string): Promise<string> {
  const { nonce, difficulty } = payload

  let solution = 0
  const encoder = new TextEncoder()

  while (true) {
    const data = encoder.encode(`${nonce}${solution}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)

    // Check if hash meets difficulty requirement
    let leadingZeros = 0
    for (const byte of hashArray) {
      if (byte === 0) {
        leadingZeros += 8
      }
      else {
        leadingZeros += Math.clz32(byte) - 24
        break
      }
    }

    if (leadingZeros >= difficulty) {
      return JSON.stringify({ payload: { ...payload, solution }, signature })
    }

    solution++

    // Safety limit
    if (solution > 10000000) {
      throw new Error('Challenge solving timeout')
    }
  }
}

/**
 * Get a Botpoison challenge solution using backend-generated challenges
 */
export async function getBotpoisonSolution(): Promise<string> {
  try {
    // Get challenge from backend (avoids CORS)
    const challengeResponse = await fetch('/api/botpoison-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!challengeResponse.ok) {
      throw new Error('Failed to get challenge from backend')
    }

    const challenge = await challengeResponse.json()

    // Solve the challenge
    const solution = await solveChallenge(challenge.payload, challenge.signature)

    return solution
  }
  catch (error) {
    console.error('Failed to generate Botpoison solution:', error)
    throw new Error('Bot protection challenge failed')
  }
}

/**
 * Verify if Botpoison is properly configured
 */
export function isBotpoisonConfigured(): boolean {
  return !!import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY
}
