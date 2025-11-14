/**
 * TikTok - Verify Credentials
 * POST /api/tiktok/verify
 *
 * Verifies TikTok credentials and returns account information
 * Follows the same pattern as /api/facebook/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import type { TikTokCredentials } from '@/types'

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

  try {
    // ✅ Step 1: Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to verify TikTok credentials',
          connected: false,
          status: 401
        },
        { status: 401 }
      )
    }

    // ✅ Step 2: Get workspace_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string }>()

    if (userError || !userData) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          message: 'Your user profile could not be found. Please try logging out and back in.',
          connected: false,
          status: 404
        },
        { status: 404 }
      )
    }

    const workspaceId = userData.workspace_id

    // ✅ Step 3: Get TikTok credentials from database
    const credentialService = new CredentialService(supabase)
    const credentials = await credentialService.getPlatformCredentials(
      workspaceId,
      'tiktok'
    )

    if (!credentials) {
      return NextResponse.json(
        {
          error: 'TikTok not connected',
          code: 'PLATFORM_NOT_CONNECTED',
          message: 'Please connect your TikTok account in Settings → Account Connections',
          connected: false,
          status: 403
        },
        { status: 403 }
      )
    }

    if (!('accessToken' in credentials) || !('openId' in credentials)) {
      return NextResponse.json(
        {
          error: 'Invalid TikTok credentials',
          code: 'INVALID_CREDENTIALS',
          message: 'TikTok credentials are incomplete or corrupted. Please reconnect your account.',
          connected: false,
          status: 400
        },
        { status: 400 }
      )
    }

    const tikTokCreds = credentials as TikTokCredentials

    // ✅ Step 4: Check if token is expired
    if (tikTokCreds.expiresAt && new Date(tikTokCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Your TikTok access token has expired. Please reconnect your account in Settings → Account Connections',
          connected: false,
          expired: true,
          status: 401
        },
        { status: 401 }
      )
    }

    // ✅ Step 5: Token is valid, return account info
    return NextResponse.json({
      connected: true,
      username: tikTokCreds.username,
      displayName: tikTokCreds.displayName,
      avatarUrl: tikTokCreds.avatarUrl,
      connectedAt: tikTokCreds.connectedAt,
      openId: tikTokCreds.openId
    })
  } catch (error) {
    // Log error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('TikTok verify error:', {
      error: errorMessage,
      ipAddress: ipAddress || 'unknown',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        error: 'Verification failed',
        code: 'VERIFY_ERROR',
        message: 'An unexpected error occurred while verifying TikTok credentials. Please try again.',
        connected: false,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        status: 500
      },
      { status: 500 }
    )
  }
}
