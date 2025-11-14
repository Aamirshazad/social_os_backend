/**
 * BASE PLATFORM SERVICE
 * Abstract base class for all platform implementations
 * Provides common functionality and enforces interface contract
 */

import {
  IPlatformService,
  OAuthConfig,
  OAuthCallbackData,
  OAuthTokenResponse,
  OAuthUserProfile,
  PlatformCredentials,
  PlatformPost,
  PlatformPostResponse,
  PlatformAnalytics,
  PlatformMedia,
  SupportedPlatform
} from '@/core/types/PlatformTypes'
import { PlatformError } from '@/core/types/PlatformTypes'
import { ExternalAPIError } from '@/core/errors/AppError'

/**
 * Base service with common OAuth and error handling
 */
export abstract class BasePlatformService implements IPlatformService {
  protected config: OAuthConfig
  protected platform: SupportedPlatform
  protected name: string
  protected icon: string

  constructor(platform: SupportedPlatform, name: string, icon: string) {
    this.platform = platform
    this.name = name
    this.icon = icon
    this.config = {
      platform,
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scopes: [],
      authorizationUrl: '',
      tokenUrl: ''
    }
  }

  initialize(config: OAuthConfig): void {
    this.config = config
  }

  abstract getAuthorizationUrl(state: string, codeChallenge?: string): string

  abstract exchangeCodeForToken(callbackData: OAuthCallbackData): Promise<OAuthTokenResponse>

  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>

  abstract getUserProfile(accessToken: string): Promise<OAuthUserProfile>

  abstract postContent(
    credentials: PlatformCredentials,
    post: PlatformPost
  ): Promise<PlatformPostResponse>

  abstract uploadMedia(credentials: PlatformCredentials, media: PlatformMedia): Promise<string>

  abstract schedulePost(
    credentials: PlatformCredentials,
    post: PlatformPost,
    scheduledTime: Date
  ): Promise<PlatformPostResponse>

  abstract verifyCredentials(credentials: PlatformCredentials): Promise<boolean>

  abstract getPostMetrics(
    credentials: PlatformCredentials,
    postId: string
  ): Promise<PlatformAnalytics>

  getPlatformName(): string {
    return this.name
  }

  getPlatformIcon(): string {
    return this.icon
  }

  abstract getMaxCharacterLimit(): number

  abstract supportsScheduling(): boolean

  abstract supportsMediaUpload(): boolean

  /**
   * Common error handling
   */
  protected handleError(error: any, context: string): never {
    let platformError: PlatformError

    if (error instanceof ExternalAPIError) {
      throw error
    }

    if (error.response) {
      platformError = {
        code: error.response.status || 'UNKNOWN',
        message: error.response.data?.message || error.message || 'Unknown error',
        platform: this.platform,
        statusCode: error.response.status,
        details: error.response.data
      }
    } else {
      platformError = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error',
        platform: this.platform,
        details: error
      }
    }

    throw new ExternalAPIError(this.name, `${context}: ${platformError.message}`)
  }

  /**
   * Validate credentials expiration
   */
  protected isCredentialsExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false
    return new Date() >= expiresAt
  }

  /**
   * Format error response
   */
  protected formatErrorResponse(
    error: any,
    context: string
  ): PlatformPostResponse {
    return {
      postId: '',
      platform: this.platform,
      status: 'failed',
      error: error.message || 'Unknown error',
      createdAt: new Date()
    }
  }
}
