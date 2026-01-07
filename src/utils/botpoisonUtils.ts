/**
 * Botpoison Browser Utilities
 * Client-side bot protection using official Botpoison library
 *
 * @see https://botpoison.com/documentation
 */

import PoisonBrowser from '@botpoison/browser'

/**
 * Get a Botpoison challenge solution
 * Uses the official Botpoison browser library for proper challenge/solution handling
 *
 * @returns {Promise<string>} The solution token to be sent to the server
 * @throws {Error} If challenge generation fails
 */
export async function getBotpoisonSolution(): Promise<string> {
  try {
    const publicKey = import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY

    if (!publicKey) {
      console.error('PUBLIC_BOTPOISON_PUBLIC_KEY not configured')
      throw new Error('Bot protection not configured')
    }

    // Initialize Botpoison with public key
    const botpoison = new PoisonBrowser({
      publicKey,
    })

    // Generate and solve challenge using official library
    // This handles everything: challenge generation, solving, and formatting
    const { solution } = await botpoison.challenge()

    return solution
  }
  catch (error) {
    console.error('Failed to generate Botpoison solution:', error)

    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
      })
    }

    throw new Error('Bot protection challenge failed')
  }
}

/**
 * Verify if Botpoison is properly configured
 * Useful for development/debugging
 *
 * @returns {boolean} True if public key is configured
 */
export function isBotpoisonConfigured(): boolean {
  return !!import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY
}
