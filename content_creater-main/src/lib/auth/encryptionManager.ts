/**
 * Server-side Encryption Manager
 * Handles all encryption/decryption operations
 * Keys are NEVER sent to client
 * Uses Node.js crypto module for secure operations
 */

import crypto from 'crypto'

/**
 * Get or create workspace encryption key
 * Derives a key from master secret + workspace ID
 */
export async function getOrCreateWorkspaceEncryptionKey(
  workspaceId: string
): Promise<Buffer> {
  try {
    const masterSecret = process.env.ENCRYPTION_MASTER_KEY

    if (!masterSecret) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable not set')
    }

    // Derive a workspace-specific key using PBKDF2
    const key = crypto.pbkdf2Sync(
      masterSecret, // password
      workspaceId, // salt
      100000, // iterations
      32, // keylen (256 bits for AES-256)
      'sha256'
    )

    return key
  } catch (error) {
    console.error('Failed to get workspace encryption key:', error)
    throw new Error('Encryption key unavailable')
  }
}

/**
 * Encrypt credentials using AES-256-GCM
 * Returns base64-encoded string with IV + ciphertext
 */
export async function encryptCredentials(
  credentials: any,
  encryptionKey: Buffer
): Promise<string> {
  try {
    const data = JSON.stringify(credentials)

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12)

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')])

    // Return as base64
    return combined.toString('base64')
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt credentials')
  }
}

/**
 * Decrypt credentials using AES-256-GCM
 */
export async function decryptCredentials(
  encryptedData: string,
  encryptionKey: Buffer
): Promise<any> {
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract IV (first 12 bytes), authTag (next 16 bytes), and ciphertext
    const iv = combined.slice(0, 12)
    const authTag = combined.slice(12, 28)
    const ciphertext = combined.slice(28)

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv)

    // Set authentication tag
    decipher.setAuthTag(authTag)

    // Decrypt
    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt credentials')
  }
}

/**
 * Hash a value using SHA-256
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
