/**
 * CREDENTIAL ENCRYPTION
 * Secure encryption/decryption of platform credentials
 * Uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption
 */

import crypto from 'crypto'
import { EncryptedCredentials, PlatformCredentials } from '@/core/types/PlatformTypes'
import { EncryptionError } from '@/core/errors/AppError'

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm'
const AUTH_TAG_LENGTH = 16 // 128 bits
const IV_LENGTH = 12 // 96 bits (recommended for GCM)
const SALT_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits
const ITERATIONS = 100000 // PBKDF2 iterations

// ============================================================================
// ENCRYPTION
// ============================================================================

/**
 * Get encryption key from master key and workspace ID
 */
export function deriveEncryptionKey(workspaceId: string): Buffer {
  try {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY
    if (!masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable not set')
    }

    // Derive workspace-specific key using PBKDF2
    const salt = Buffer.from(workspaceId, 'utf-8')

    const derivedKey = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')

    return derivedKey
  } catch (error) {
    throw new EncryptionError(`Failed to derive encryption key: ${String(error)}`)
  }
}

/**
 * Encrypt credentials
 */
export function encryptCredentials(
  credentials: PlatformCredentials,
  workspaceId: string
): EncryptedCredentials {
  try {
    const key = deriveEncryptionKey(workspaceId)

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    // Serialize credentials to JSON
    const credentialsJson = JSON.stringify(credentials)

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(credentialsJson, 'utf-8'),
      cipher.final()
    ])

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    }
  } catch (error) {
    throw new EncryptionError(`Failed to encrypt credentials: ${String(error)}`)
  }
}

/**
 * Decrypt credentials
 */
export function decryptCredentials(
  encryptedData: EncryptedCredentials,
  workspaceId: string
): PlatformCredentials {
  try {
    const key = deriveEncryptionKey(workspaceId)

    // Decode base64
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64')
    const iv = Buffer.from(encryptedData.iv, 'base64')
    const authTag = Buffer.from(encryptedData.authTag, 'base64')

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    // Set authentication tag
    decipher.setAuthTag(authTag)

    // Decrypt
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    // Parse JSON
    const credentialsJson = decrypted.toString('utf-8')
    const credentials = JSON.parse(credentialsJson)

    return credentials as PlatformCredentials
  } catch (error) {
    throw new EncryptionError(`Failed to decrypt credentials: ${String(error)}`)
  }
}

/**
 * Hash credentials for comparison (useful for checking if credentials changed)
 */
export function hashCredentials(credentials: PlatformCredentials): string {
  try {
    const json = JSON.stringify(credentials)
    const hash = crypto.createHash('sha256').update(json).digest('hex')
    return hash
  } catch (error) {
    throw new EncryptionError(`Failed to hash credentials: ${String(error)}`)
  }
}

/**
 * Safely store encrypted credential string
 */
export function storeEncryptedCredentials(encrypted: EncryptedCredentials): string {
  try {
    // Return as base64-encoded JSON for storage
    const json = JSON.stringify(encrypted)
    return Buffer.from(json).toString('base64')
  } catch (error) {
    throw new EncryptionError(`Failed to store encrypted credentials: ${String(error)}`)
  }
}

/**
 * Safely retrieve encrypted credential string
 */
export function retrieveEncryptedCredentials(stored: string): EncryptedCredentials {
  try {
    const json = Buffer.from(stored, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch (error) {
    throw new EncryptionError(`Failed to retrieve encrypted credentials: ${String(error)}`)
  }
}

/**
 * End-to-end: Encrypt and store
 */
export function encryptAndStoreCredentials(
  credentials: PlatformCredentials,
  workspaceId: string
): string {
  const encrypted = encryptCredentials(credentials, workspaceId)
  return storeEncryptedCredentials(encrypted)
}

/**
 * End-to-end: Retrieve and decrypt
 */
export function retrieveAndDecryptCredentials(
  stored: string,
  workspaceId: string
): PlatformCredentials {
  const encrypted = retrieveEncryptedCredentials(stored)
  return decryptCredentials(encrypted, workspaceId)
}

/**
 * Test encryption/decryption
 */
export function testEncryption(workspaceId: string = 'test-workspace'): boolean {
  try {
    const testData: PlatformCredentials = {
      platform: 'twitter',
      accessToken: 'test_token_123',
      refreshToken: 'test_refresh_token_456',
      userId: 'user123',
      username: 'testuser',
      expiresAt: new Date(Date.now() + 3600000)
    }

    // Encrypt
    const encrypted = encryptCredentials(testData, workspaceId)

    // Decrypt
    const decrypted = decryptCredentials(encrypted, workspaceId)

    // Verify
    return (
      decrypted.accessToken === testData.accessToken &&
      decrypted.refreshToken === testData.refreshToken &&
      decrypted.userId === testData.userId
    )
  } catch (error) {
    console.error('Encryption test failed:', error)
    return false
  }
}
