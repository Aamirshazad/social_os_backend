/**
 * Facebook Token Debug Endpoint
 * GET /api/facebook/debug-token?token={accessToken}
 *
 * Verifies token validity, expiration, and granted scopes
 * Helps diagnose "Invalid Scopes" errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { FACEBOOK_GRAPH_BASE } from '@/lib/facebook/client'

interface TokenDebugResponse {
  valid: boolean
  appId?: string
  userId?: string
  expiresAt?: string
  isExpired?: boolean
  grantedScopes?: string[]
  errorDescription?: string
  errorCode?: string
  recommendation?: string
}

async function debugFacebookToken(
  token: string,
  appId?: string,
  appSecret?: string
): Promise<TokenDebugResponse> {
  try {
    // First, try to debug the token
    const appToken = appSecret && appId ? `${appId}|${appSecret}` : process.env.FACEBOOK_APP_TOKEN

    if (!appToken) {
      return {
        valid: false,
        errorCode: 'NO_APP_TOKEN',
        errorDescription: 'Facebook App Token not configured. Cannot debug token without app credentials.',
        recommendation: 'Set FACEBOOK_APP_TOKEN or provide both appId and appSecret',
      }
    }

    const debugUrl = new URL(`${FACEBOOK_GRAPH_BASE}/debug_token`)
    debugUrl.searchParams.append('input_token', token)
    debugUrl.searchParams.append('access_token', appToken)

    const debugResponse = await fetch(debugUrl.toString())
    const debugData = await debugResponse.json()

    if (debugData.error) {
      return {
        valid: false,
        errorCode: debugData.error.code,
        errorDescription: debugData.error.message,
        recommendation: 'The token is invalid or has expired. Try reconnecting your Facebook account.',
      }
    }

    const { data } = debugData

    if (!data.is_valid) {
      let recommendation = 'Token is no longer valid. Reconnect your Facebook account.'

      if (data.error) {
        recommendation = `Error: ${data.error.message}. ${recommendation}`
      }

      return {
        valid: false,
        errorCode: 'INVALID_TOKEN',
        errorDescription: 'Token validation failed',
        recommendation,
      }
    }

    // Calculate expiration
    const expiresAt = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : undefined
    const isExpired = data.expires_at ? data.expires_at < Math.floor(Date.now() / 1000) : false

    // Extract granted scopes
    const grantedScopes = data.scopes || []

    // Check for problematic scopes
    const requiredScopes = ['pages_manage_posts', 'pages_read_user_content', 'read_insights']
    const missingScopes = requiredScopes.filter(s => !grantedScopes.includes(s))

    let recommendation = undefined
    if (missingScopes.length > 0) {
      recommendation = `Missing advanced permissions: ${missingScopes.join(', ')}. These require Facebook App Review. Contact your app administrator to submit for review.`
    }

    if (isExpired) {
      recommendation = `Token has expired (${expiresAt}). Reconnect your Facebook account to refresh.`
    }

    return {
      valid: true,
      appId: data.app_id,
      userId: data.user_id,
      expiresAt,
      isExpired,
      grantedScopes,
      recommendation,
    }
  } catch (error) {
    console.error('Token debug error:', error)
    return {
      valid: false,
      errorCode: 'DEBUG_ERROR',
      errorDescription: error instanceof Error ? error.message : 'Unknown error during token debug',
      recommendation: 'Check server logs for more details',
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const appId = searchParams.get('appId')
    const appSecret = searchParams.get('appSecret')

    if (!token) {
      return NextResponse.json(
        {
          error: 'Missing token parameter',
          code: 'MISSING_TOKEN',
          message: 'Usage: /api/facebook/debug-token?token={accessToken}',
        },
        { status: 400 }
      )
    }

    const result = await debugFacebookToken(
      token,
      appId || undefined,
      appSecret || undefined
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug token endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Failed to debug token',
        code: 'DEBUG_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for more secure token debugging (with body parameters)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, appId, appSecret } = body

    if (!token) {
      return NextResponse.json(
        {
          error: 'Missing token in request body',
          code: 'MISSING_TOKEN',
        },
        { status: 400 }
      )
    }

    const result = await debugFacebookToken(token, appId, appSecret)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug token POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to debug token',
        code: 'DEBUG_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
