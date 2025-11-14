/**
 * CSRF State Generator using cryptographically secure random
 * Supports PKCE (Proof Key for Code Exchange)
 */

import crypto from 'crypto'

/**
 * Generate a cryptographically secure random state
 * Used for CSRF protection in OAuth flows
 */
export function generateRandomState(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate PKCE parameters
 * code_verifier: Random value sent back to token endpoint
 * code_challenge: Hash of code_verifier sent to authorization endpoint
 */
export function generatePKCE(): {
  codeChallenge: string
  codeVerifier: string
} {
  // Generate random code verifier (43-128 characters, unreserved characters)
  const codeVerifier = crypto
    .randomBytes(32)
    .toString('hex')
    .substring(0, 128)

  // Create code challenge using S256 (SHA256)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return { codeChallenge, codeVerifier }
}

/**
 * Verify PKCE
 * Ensures code_verifier matches code_challenge
 */
export function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  try {
    const computed = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(codeChallenge))
  } catch (error) {
    console.error('PKCE verification error:', error)
    return false
  }
}

/**
 * Generate a random string suitable for cryptographic operations
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
