/**
 * OAUTH STATE MANAGEMENT SERVICE
 * Manages OAuth state tokens for CSRF protection and flow tracking
 * Stores states in database for stateless server architecture
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import crypto from 'node:crypto'

/**
 * OAuth state record in database
 */
export interface OAuthState {
  id: string
  state: string
  platform: string
  workspace_id: string
  code_challenge?: string | null
  code_challenge_method?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  expires_at: string
  is_used: boolean
  used_at?: string | null
}

/**
 * OAuth State Service
 * Handles creation, validation, and cleanup of OAuth states
 */
export class OAuthStateService {
  private supabase: ReturnType<typeof createClient<Database>>

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Generate secure random state
   * Combined with PKCE code challenge for enhanced security
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate PKCE code challenge and verifier pair
   * S256 method: code_challenge = BASE64URL(SHA256(code_verifier))
   */
  generatePKCE(): {
    codeChallenge: string
    codeVerifier: string
  } {
    const verifier = crypto.randomBytes(32).toString('hex')
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')

    return {
      codeChallenge: challenge,
      codeVerifier: verifier
    }
  }

  /**
   * Create new OAuth state record
   * Automatically expires in 10 minutes
   */
  async createState(
    platform: string,
    workspaceId: string,
    codeChallenge?: string
  ): Promise<OAuthState> {
    const state = this.generateState()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const { data, error } = await this.supabase
      .from('oauth_states')
      .insert({
        state,
        platform: platform as any,
        workspace_id: workspaceId,
        code_challenge: codeChallenge || null,
        code_challenge_method: codeChallenge ? 'S256' : null,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_used: false
      } as any)
      .select()
      .single() as any

    if (error) {
      throw new Error(`Failed to create OAuth state: ${error.message}`)
    }

    return data as OAuthState
  }

  /**
   * Validate OAuth state
   * Checks if state exists, hasn't expired, and hasn't been used
   */
  async validateState(state: string, platform: string, workspaceId: string): Promise<OAuthState> {
    const { data, error } = await this.supabase
      .from('oauth_states')
      .select()
      .eq('state', state)
      .eq('platform', platform as any)
      .eq('workspace_id', workspaceId)
      .eq('is_used', false)
      .maybeSingle() as any

    if (error) {
      throw new Error(`Failed to validate state: ${error.message}`)
    }

    if (!data) {
      throw new Error('Invalid or expired OAuth state')
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      throw new Error('OAuth state has expired')
    }

    return data as OAuthState
  }

  /**
   * Mark state as used (prevents replay attacks)
   */
  async markStateUsed(stateId: string): Promise<void> {
    const supabaseQuery = this.supabase
      .from('oauth_states') as any
    const result = await supabaseQuery
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', stateId)
    const { error } = result

    if (error) {
      throw new Error(`Failed to mark state as used: ${error.message}`)
    }
  }

  /**
   * Cleanup expired states
   * Should be run periodically via background job
   */
  async cleanupExpiredStates(): Promise<number> {
    const { data, error } = await (this.supabase
      .from('oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString()) as any)

    if (error) {
      throw new Error(`Failed to cleanup states: ${error.message}`)
    }

    return data?.length || 0
  }

  /**
   * Get state by ID for retrieving code verifier
   */
  async getStateById(stateId: string): Promise<OAuthState> {
    const { data, error } = await (this.supabase
      .from('oauth_states')
      .select()
      .eq('id', stateId)
      .single() as any)

    if (error) {
      throw new Error(`Failed to retrieve state: ${error.message}`)
    }

    return data as OAuthState
  }
}

// Export singleton instance
export const oauthStateService = new OAuthStateService()
