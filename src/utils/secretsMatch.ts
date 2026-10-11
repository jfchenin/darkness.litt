// src/utils/secretsMatch.ts
import { createHash, timingSafeEqual } from 'node:crypto'

/** Return true when both strings are equal, without leaking their contents through timing. */
export function secretsMatch(provided: string, expected: string): boolean {
  const providedHash = createHash('sha256').update(provided, 'utf8').digest()
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(providedHash, expectedHash)
}
