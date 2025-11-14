/**
 * OAuth Initiation Route
 * POST /api/auth/oauth/[platform]
 *
 * Initiates OAuth flow for any supported platform
 * Generates CSRF state and PKCE parameters
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createOAuthState } from '@/services/database/oauthStateService'
import { logAuditEvent } from '@/services/database/auditLogService'
import { WorkspaceService } from '@/services/database/workspaceService'
import { getFacebookScopes } from '@/lib/facebook/client'
import { INSTAGRAM_SCOPES } from '@/lib/instagram/client'
import type { Platform } from '@/types'

const OAUTH_URLS: Record<string, string> = {
  twitter: 'https://twitter.com/i/oauth2/authorize',
  linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
  facebook: 'https://www.facebook.com/v24.0/dialog/oauth',
  instagram: 'https://www.facebook.com/v24.0/dialog/oauth', // Instagram uses Facebook OAuth
  tiktok: 'https://www.tiktok.com/v1/oauth/authorize',
  youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
}

const SCOPES: Record<string, string[]> = {
  twitter: ['tweet.write', 'tweet.read', 'users.read'],
  linkedin: ['r_basicprofile', 'w_member_social', 'r_emailaddress'],
  facebook: getFacebookScopes(), // Use environment-based scope selection
  instagram: INSTAGRAM_SCOPES,
  tiktok: ['user.info.basic', 'video.upload', 'video.publish'],
  youtube: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params
  const platform = platformParam as Platform
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  const userAgent = req.headers.get('user-agent')

  console.log(`🚀 [OAuth Init] Starting OAuth initiation for platform: ${platform}`)
  console.log(`📍 [OAuth Init] Request from IP: ${ipAddress || 'unknown'}`)

  try {
    // ✅ Step 1: Authenticate user
    console.log(`✅ [OAuth Init] Step 1: Authenticating user for ${platform}`)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error(`❌ [OAuth Init] No authenticated user for ${platform}`)
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }
    
    console.log(`✅ [OAuth Init] User authenticated: ${user.id} for ${platform}`)

    // ✅ Step 2: Ensure user has workspace and get role
    console.log(`✅ [OAuth Init] Step 2: Ensuring workspace for ${platform}`)
    let workspaceId: string
    let userRole: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
      console.log(`✅ [OAuth Init] Workspace ensured: ${workspaceId}`)
      
      // Get user role using RPC to avoid RLS recursion
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
      if (!rpcError && rpcData) {
        const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
        userRole = profileData?.role || 'admin'
        console.log(`✅ [OAuth Init] User role retrieved: ${userRole}`)
      } else {
        // Fallback to admin if RPC fails
        console.warn(`⚠️ [OAuth Init] Failed to get user role via RPC, defaulting to admin:`, rpcError)
        userRole = 'admin'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
      console.error(`❌ [OAuth Init] Error ensuring user workspace:`, errorMessage, error)
      return NextResponse.json(
        { error: errorMessage, code: 'WORKSPACE_INIT_ERROR' },
        { status: 500 }
      )
    }

    // Check if user is admin (required for OAuth connections)
    console.log(`🔐 [OAuth Init] Checking admin permissions for ${platform}`)
    if (userRole !== 'admin') {
      console.error(`❌ [OAuth Init] User is not admin (role: ${userRole}) for ${platform}`)
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform,
        action: 'oauth_initiation_unauthorized',
        status: 'failed',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: 'Only workspace admins can manage account connections', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // ✅ Step 3: Validate platform
    if (!Object.keys(OAUTH_URLS).includes(platform)) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform,
        action: 'oauth_initiation_invalid_platform',
        status: 'failed',
        errorCode: 'INVALID_PLATFORM',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: 'Invalid platform', code: 'INVALID_PLATFORM' },
        { status: 400 }
      )
    }

    // ✅ Step 4: Get platform configuration
    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`]
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const callbackUrl = `${baseUrl}/api/auth/oauth/${platform}/callback`

    if (!clientId) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform,
        action: 'oauth_initiation_config_missing',
        status: 'failed',
        errorCode: 'CONFIG_MISSING',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: `${platform} is not configured`, code: 'CONFIG_MISSING' },
        { status: 500 }
      )
    }

    // ✅ Step 5: Create OAuth state (CSRF protection)
    console.log(`🔐 [OAuth Init] Step 5: Creating OAuth state for ${platform}`)
    let oauthState: Awaited<ReturnType<typeof createOAuthState>>
    try {
      // Facebook and Instagram don't support PKCE - they use app_secret instead
      const usePKCE = platform !== 'facebook' && platform !== 'instagram'
      console.log(`🔐 [OAuth Init] Using PKCE: ${usePKCE} for ${platform}`)
      
      oauthState = await createOAuthState(
        workspaceId,
        platform,
        ipAddress || undefined,
        userAgent || undefined,
        usePKCE
      )
      console.log(`✅ [OAuth Init] OAuth state created for ${platform}:`, {
        statePrefix: oauthState.state.substring(0, 20),
        hasPKCE: !!oauthState.codeChallenge,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [OAuth Init] Failed to create OAuth state for ${platform}:`, errorMessage, error)
      throw new Error(`Failed to create OAuth state: ${errorMessage}`)
    }

    // ✅ Step 6: Build OAuth authorization URL
    console.log(`🔗 [OAuth Init] Step 6: Building OAuth URL for ${platform}`)
    const params = new URLSearchParams({
      ...(platform === 'instagram' ? { app_id: clientId } : { client_id: clientId }),
      redirect_uri: callbackUrl,
      response_type: 'code',
      state: oauthState.state,
    })

    // Add platform-specific parameters
    if (platform === 'twitter') {
      params.append('code_challenge', oauthState.codeChallenge!)
      params.append('code_challenge_method', 'S256')
      params.append('scope', SCOPES[platform].join(' '))
    } else if (platform === 'linkedin') {
      // LinkedIn requires scopes separated by spaces (URLSearchParams will handle encoding)
      params.append('scope', SCOPES[platform].join(' '))
    } else if (platform === 'facebook' || platform === 'instagram') {
      params.append('scope', SCOPES[platform].join(','))
      params.append('display', 'popup')
    } else if (platform === 'tiktok') {
      params.set('client_key', clientId)
      params.delete('client_id')
      params.append('scope', SCOPES[platform].join(' '))
      params.append('code_challenge', oauthState.codeChallenge!)
      params.append('code_challenge_method', 'S256')
    } else if (platform === 'youtube') {
      params.append('scope', SCOPES[platform].join(' '))
      params.append('access_type', 'offline')
      params.append('prompt', 'consent')
      params.append('code_challenge', oauthState.codeChallenge!)
      params.append('code_challenge_method', 'S256')
    }

    const oauthUrl = `${OAUTH_URLS[platform]}?${params.toString()}`

    // ✅ Step 7: Store PKCE verifier in secure httpOnly cookie
    const response = NextResponse.json({
      success: true,
      redirectUrl: oauthUrl,
    })

    if (oauthState.codeVerifier) {
      response.cookies.set(
        `oauth_${platform}_verifier`,
        oauthState.codeVerifier,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 10 * 60, // 10 minutes
          path: '/',
        }
      )
    }

    // ✅ Step 8: Log success (non-blocking)
    logAuditEvent({
      workspaceId,
      userId: user.id,
      platform,
      action: 'oauth_initiation_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
    }).catch(err => {
      console.warn('Failed to log OAuth success event (non-blocking):', err)
    })

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`OAuth initiation error for ${platform}:`, {
      message: errorMessage,
      stack: errorStack,
      platform,
    })

    // Attempt to log error (don't let this fail the response)
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Use RPC to get workspace_id to avoid RLS recursion
        const { data: rpcData } = await supabase.rpc('get_my_profile')
        const profileData: any = rpcData ? (Array.isArray(rpcData) ? rpcData[0] : rpcData) : null
        
        if (profileData?.workspace_id) {
          await logAuditEvent({
            workspaceId: profileData.workspace_id,
            userId: user.id,
            platform,
            action: 'oauth_initiation_error',
            status: 'failed',
            errorMessage: errorMessage,
            errorCode: 'INITIATION_ERROR',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
          })
        }
      }
    } catch (auditError) {
      console.error('Failed to log OAuth error:', auditError)
    }

    // Return more specific error message in development, generic in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: isDevelopment ? errorMessage : 'Failed to initiate OAuth',
        code: 'INITIATION_ERROR',
        ...(isDevelopment && { details: errorStack })
      },
      { status: 500 }
    )
  }
}
