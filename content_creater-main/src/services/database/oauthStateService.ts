/**
 * OAuth State Service
 * Manages CSRF state tokens and PKCE verification
 * Database-backed for security
 */

import { createServerClient } from '@/lib/supabase/server'
import {
  generateRandomState,
  generatePKCE,
  verifyPKCE,
} from '@/lib/auth/stateGenerator'
import type { Platform } from '@/types'

export interface OAuthStateData {
  state: string
  codeVerifier?: string
  codeChallenge?: string
  expiresAt: Date
}

/**
 * Create OAuth state for CSRF protection and PKCE
 */
export async function createOAuthState(
  workspaceId: string,
  platform: Platform,
  ipAddress?: string,
  userAgent?: string,
  usePKCE: boolean = true
): Promise<OAuthStateData> {
  try {
    console.log('[createOAuthState] Creating state for:', {
      workspaceId,
      platform,
      usePKCE,
    })

    // Generate state
    const state = generateRandomState()

    let codeVerifier: string | undefined
    let codeChallenge: string | undefined
    let codeChallengeMethod: string | undefined

    // Generate PKCE if needed
    if (usePKCE) {
      const pkce = generatePKCE()
      codeChallenge = pkce.codeChallenge
      codeVerifier = pkce.codeVerifier
      codeChallengeMethod = 'S256'
    }

    // Calculate expiration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    console.log('[createOAuthState] Generated state:', {
      statePrefix: state.substring(0, 20),
      hasPKCE: !!codeChallenge,
      expiresAt: expiresAt.toISOString(),
    })

    // Get server-side Supabase client
    const supabase = await createServerClient()

    // Store in database
    const { error } = await (supabase.from('oauth_states') as any).insert({
      workspace_id: workspaceId,
      platform,
      state,
      code_challenge: codeChallenge || null,
      code_challenge_method: codeChallengeMethod || null,
      expires_at: expiresAt.toISOString(),
      is_used: false,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })

    if (error) {
      console.error('[createOAuthState] Error inserting OAuth state:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`Failed to create OAuth state: ${error.message}`)
    }

    console.log('[createOAuthState] ✅ State created successfully')

    return {
      state,
      codeVerifier,
      codeChallenge,
      expiresAt,
    }
  } catch (error) {
    console.error('[createOAuthState] Error creating OAuth state:', error)
    // Preserve the original error message if it's already an Error
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to create OAuth state: ${String(error)}`)
  }
}

/**
 * Verify OAuth state (CSRF check)
 * Also validates PKCE if present
 */
export async function verifyOAuthState(
  workspaceId: string,
  platform: Platform,
  state: string
): Promise<{
  valid: boolean
  codeChallenge?: string
  codeChallengeMethod?: string
  error?: string
}> {
  try {
    console.log('[verifyOAuthState] Starting verification:', {
      workspaceId,
      platform,
      statePrefix: state?.substring(0, 20),
    })

    // Get server-side Supabase client
    const supabase = await createServerClient()

    // Query database for state
    const { data, error } = await (supabase
      .from('oauth_states') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .eq('state', state)
      .maybeSingle()

    if (error) {
      console.error('[verifyOAuthState] Database query error:', error)
      throw error
    }

    console.log('[verifyOAuthState] Query result:', {
      found: !!data,
      isUsed: data ? (data as any).is_used : null,
      expiresAt: data ? (data as any).expires_at : null,
    })

    // Check if state exists
    if (!data) {
      console.warn('[verifyOAuthState] State not found in database')
      return { valid: false, error: 'State not found' }
    }

    // Check if already used (replay attack prevention)
    if ((data as any).is_used) {
      console.warn('[verifyOAuthState] State already used (replay attack)')
      return { valid: false, error: 'State already used (replay attack detected)' }
    }

    // Check if expired
    const expiresAt = new Date((data as any).expires_at).getTime()
    const now = Date.now()
    if (now > expiresAt) {
      console.warn('[verifyOAuthState] State expired:', {
        expiresAt: new Date(expiresAt).toISOString(),
        now: new Date(now).toISOString(),
        expiredBy: now - expiresAt,
      })
      return { valid: false, error: 'State expired' }
    }

    console.log('[verifyOAuthState] State is valid, marking as used')

    // Mark as used atomically to prevent race conditions
    // This ensures only one callback can successfully mark the state as used
    const { data: updateData, error: updateError } = await (supabase
      .from('oauth_states') as any)
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', (data as any).id)
      .eq('is_used', false) // Only update if not already used (atomic check)
      .select()

    if (updateError) {
      console.error('[verifyOAuthState] Failed to mark state as used:', updateError)
      throw updateError
    }

    // If no rows were updated, it means another request already marked it as used
    if (!updateData || updateData.length === 0) {
      console.warn('[verifyOAuthState] State was already marked as used by another request (race condition)')
      return { valid: false, error: 'State already used (concurrent request detected)' }
    }

    console.log('[verifyOAuthState] ✅ State verified and marked as used')

    return {
      valid: true,
      codeChallenge: (data as any).code_challenge || undefined,
      codeChallengeMethod: (data as any).code_challenge_method || undefined,
    }
  } catch (error) {
    console.error('[verifyOAuthState] Error verifying OAuth state:', error)
    return { valid: false, error: 'State verification failed' }
  }
}

/**
 * Verify PKCE
 */
export function verifyPKCECode(
  codeVerifier: string,
  codeChallenge: string
): boolean {
  return verifyPKCE(codeVerifier, codeChallenge)
}

/**
 * Clean up expired OAuth states
 * Should be run periodically as a background job
 */
export async function cleanupExpiredStates(): Promise<number> {
  try {
    // Get server-side Supabase client
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) throw error

    const deletedCount = data?.length || 0
    console.log(`Cleaned up ${deletedCount} expired OAuth states`)

    return deletedCount
  } catch (error) {
    console.error('Error cleaning up OAuth states:', error)
    return 0
  }
}

/**
 * Get state info for debugging
 */
export async function getStateInfo(
  workspaceId: string,
  state: string
): Promise<any | null> {
  try {
    // Get server-side Supabase client
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('state', state)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting state info:', error)
    return null
  }
}

/**
 * Clean up all states for a workspace (on logout or cleanup)
 */
export async function clearWorkspaceOAuthStates(workspaceId: string): Promise<number> {
  try {
    // Get server-side Supabase client
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('oauth_states')
      .delete()
      .eq('workspace_id', workspaceId)
      .select('id')

    if (error) throw error

    return data?.length || 0
  } catch (error) {
    console.error('Error clearing OAuth states:', error)
    return 0
  }
}
