/**
 * SOCIAL ACCOUNT REPOSITORY
 * Manages social media platform credentials and connections
 * Handles secure storage and retrieval of encrypted credentials
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Repository, FindOptions, PaginatedResult, CursorPaginatedResult } from '../Repository'
import { SocialAccountDTO, CreateMediaAssetDTO, UpdateMediaAssetDTO } from '../../types/DTOs'
import { Database, PlatformType } from '@/lib/supabase/types'
import { DatabaseError } from '../../errors/AppError'
import {
  encryptAndStoreCredentials,
  retrieveAndDecryptCredentials
} from '@/lib/encryption/CredentialEncryption'
import { PlatformCredentials } from '@/core/types/PlatformTypes'

export class SocialAccountRepository
  extends Repository<SocialAccountDTO, any, any> {

  protected tableName = 'social_accounts'

  private async getSupabase() {
    const cookieStore = await cookies()
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Handle cookie errors
            }
          }
        }
      }
    )
  }

  /**
   * Find all social accounts (base repository method - not typically used)
   */
  async findAll(options?: FindOptions): Promise<SocialAccountDTO[]> {
    throw new Error('Use findAllByWorkspace instead for workspace-specific queries')
  }

  /**
   * Find all social accounts in workspace
   */
  async findAllByWorkspace(workspaceId: string, options?: FindOptions): Promise<SocialAccountDTO[]> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)

      if (options?.orderBy) {
        options.orderBy.forEach((order) => {
          query = query.order(order.field, { ascending: order.direction === 'asc' })
        })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      throw new DatabaseError('Failed to fetch social accounts', { error: String(error) })
    }
  }

  /**
   * Find account by ID
   */
  async findById(accountId: string): Promise<SocialAccountDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to fetch social account', { error: String(error) })
    }
  }

  /**
   * Find by workspace and platform
   */
  async findByWorkspaceAndPlatform(
    workspaceId: string,
    platform: PlatformType
  ): Promise<SocialAccountDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to find social account', { error: String(error) })
    }
  }

  /**
   * Find by workspace and account ID
   */
  async findByAccountId(
    workspaceId: string,
    accountId: string
  ): Promise<SocialAccountDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('account_id', accountId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to find social account', { error: String(error) })
    }
  }

  /**
   * Create (base repository method - not typically used)
   */
  async create(data: any): Promise<SocialAccountDTO> {
    throw new Error('Use createSocialAccount instead')
  }

  /**
   * Create social account with encrypted credentials
   */
  async createSocialAccount(
    workspaceId: string,
    platform: PlatformType,
    credentials: PlatformCredentials,
    accountInfo: {
      username?: string
      accountId?: string
      accountName?: string
      profileImageUrl?: string
      email?: string
      pageId?: string
      pageName?: string
    }
  ): Promise<SocialAccountDTO> {
    try {
      const supabase = await this.getSupabase()

      // Encrypt credentials
      const encryptedCredentials = encryptAndStoreCredentials(credentials, workspaceId)

      const accountData = {
        workspace_id: workspaceId,
        platform,
        credentials_encrypted: encryptedCredentials,
        refresh_token_encrypted: credentials.refreshToken
          ? encryptAndStoreCredentials(
              { ...credentials, accessToken: '' },
              workspaceId
            )
          : null,
        username: accountInfo.username,
        account_id: accountInfo.accountId,
        account_name: accountInfo.accountName,
        profile_picture_url: accountInfo.profileImageUrl,
        is_connected: true,
        is_verified: false,
        connected_at: new Date().toISOString(),
        platform_user_id: credentials.userId,
        page_id: accountInfo.pageId,
        access_token_expires_at: credentials.expiresAt?.toISOString(),
        refresh_error_count: 0
      }

      const { data: result, error } = await (supabase as any)
        .from('social_accounts')
        .insert([accountData])
        .select()
        .single()

      if (error) throw error
      if (!result) throw new Error('Failed to create social account')

      return result as SocialAccountDTO
    } catch (error) {
      throw new DatabaseError('Failed to create social account', { error: String(error) })
    }
  }

  /**
   * Update social account
   */
  async update(accountId: string, data: Partial<SocialAccountDTO>): Promise<SocialAccountDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data: result, error } = await (supabase as any)
        .from('social_accounts')
        .update(data)
        .eq('id', accountId)
        .select()
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return result || null
    } catch (error) {
      throw new DatabaseError('Failed to update social account', { error: String(error) })
    }
  }

  /**
   * Get decrypted credentials
   */
  async getDecryptedCredentials(
    workspaceId: string,
    accountId: string
  ): Promise<PlatformCredentials> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await (supabase as any)
        .from('social_accounts')
        .select('credentials_encrypted')
        .eq('id', accountId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Account not found')

      return retrieveAndDecryptCredentials(data.credentials_encrypted, workspaceId)
    } catch (error) {
      throw new DatabaseError('Failed to decrypt credentials', { error: String(error) })
    }
  }

  /**
   * Update access token
   */
  async updateAccessToken(
    accountId: string,
    newToken: string,
    expiresIn: number
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      const { error } = await (supabase as any)
        .from('social_accounts')
        .update({
          access_token_expires_at: expiresAt.toISOString(),
          last_refreshed_at: new Date().toISOString(),
          refresh_error_count: 0
        })
        .eq('id', accountId)

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to update access token', { error: String(error) })
    }
  }

  /**
   * Mark token refresh error
   */
  async markRefreshError(accountId: string, errorMessage: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await (supabase as any)
        .from('social_accounts')
        .update({
          last_error_message: errorMessage,
          refresh_error_count: (supabase as any).rpc('increment_error_count', { account_id: accountId }),
          last_refreshed_at: new Date().toISOString()
        })
        .eq('id', accountId)

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to mark refresh error', { error: String(error) })
    }
  }

  /**
   * Verify connection
   */
  async verifyConnection(accountId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await (supabase as any)
        .from('social_accounts')
        .update({
          is_verified: true,
          last_verified_at: new Date().toISOString()
        })
        .eq('id', accountId)

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to verify connection', { error: String(error) })
    }
  }

  /**
   * Disconnect account
   */
  async disconnect(accountId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await (supabase as any)
        .from('social_accounts')
        .update({
          is_connected: false,
          is_verified: false
        })
        .eq('id', accountId)

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to disconnect account', { error: String(error) })
    }
  }

  /**
   * Get connected platforms
   */
  async getConnectedPlatforms(workspaceId: string): Promise<PlatformType[]> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await (supabase as any)
        .from('social_accounts')
        .select('platform')
        .eq('workspace_id', workspaceId)
        .eq('is_connected', true)

      if (error) throw error

      return ((data as any) || []).map((item: any) => item.platform as PlatformType)
    } catch (error) {
      throw new DatabaseError('Failed to get connected platforms', { error: String(error) })
    }
  }

  // Repository abstract methods (not used for SocialAccount but required by interface)
  async find(): Promise<SocialAccountDTO[]> {
    throw new Error('Not implemented')
  }

  async findFirst(): Promise<SocialAccountDTO | null> {
    throw new Error('Not implemented')
  }

  async count(): Promise<number> {
    throw new Error('Not implemented')
  }

  async delete(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async deleteMany(): Promise<number> {
    throw new Error('Not implemented')
  }

  async exists(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async paginate(): Promise<PaginatedResult<SocialAccountDTO>> {
    throw new Error('Not implemented')
  }

  async cursorPaginate(): Promise<CursorPaginatedResult<SocialAccountDTO>> {
    throw new Error('Not implemented')
  }

  async upsert(): Promise<SocialAccountDTO> {
    throw new Error('Not implemented')
  }
}
