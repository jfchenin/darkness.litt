/**
 * Botpoison Browser Utilities
 * Client-side bot protection using Botpoison
 *
 * @see https://botpoison.com/documentation
 */

import PoisonBrowser from '@botpoison/browser'

// Initialize Botpoison browser instance with public key from environment
const botbrowser = new PoisonBrowser({
  publicKey: import.meta.env.PUBLIC_BOTPOISON_PUBLIC_KEY,
})

/**
 * Get a Botpoison challenge solution
 * This should be called before submitting forms or making sensitive requests
 *
 * @returns {Promise<string>} The solution token to
 be sent to the server
 * @throws {Error} If challenge generation fails
 */
export async function getBotpoisonSolution(): Promise<string> {
  try {
    const { solution } = await botbrowser.challenge()
    return solution
  }
  catch (error) {
    console.error('Failed to generate Botpoison solution:', error)
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
