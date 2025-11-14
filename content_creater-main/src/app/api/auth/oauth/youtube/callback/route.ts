/**
 * YouTube OAuth Callback
 * GET /api/auth/oauth/youtube/callback?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { verifyOAuthState } from "@/services/database/oauthStateService"
import { CredentialService } from "@/services/database/credentialService"
import { logAuditEvent } from "@/services/database/auditLogService"

export async function GET(req: NextRequest) {
  console.log('🚀 YouTube OAuth Callback started')
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")

  console.log('📥 Callback params:', {
    code: code?.substring(0, 20) + '...',
    state: state?.substring(0, 20) + '...',
    error,
  })

  try {
    console.log('✅ Step 1: Checking authentication')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ No authenticated user found')
      return NextResponse.redirect(new URL("/login?error=oauth_unauthorized", req.nextUrl.origin))
    }
    console.log('✅ User authenticated:', user.id)

    // Get workspace and role using RPC to avoid RLS recursion
    console.log('✅ Step 2: Getting workspace and verifying admin role')
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
    
    if (rpcError || !rpcData) {
      console.log('❌ No user profile found via RPC:', rpcError)
      return NextResponse.redirect(new URL("/settings?tab=accounts&oauth_error=no_workspace", req.nextUrl.origin))
    }

    const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const workspaceId = profileData?.workspace_id
    const userRole = profileData?.role || 'admin'

    if (!workspaceId) {
      console.log('❌ No workspace_id found')
      return NextResponse.redirect(new URL("/settings?tab=accounts&oauth_error=no_workspace", req.nextUrl.origin))
    }
    
    console.log('✅ User workspace:', workspaceId, 'Role:', userRole)

    if (userRole !== "admin") {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "youtube",
        action: "oauth_callback_unauthorized",
        status: "failed",
        errorCode: "INSUFFICIENT_PERMISSIONS",
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=insufficient_permissions", req.nextUrl.origin)
      )
    }

    if (error) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "youtube",
        action: "oauth_user_denied",
        status: "failed",
        errorCode: error,
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(new URL("/settings?tab=accounts&oauth_error=user_denied", req.nextUrl.origin))
    }

    if (!code || !state) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "youtube",
        action: "oauth_missing_params",
        status: "failed",
        errorCode: "MISSING_PARAMS",
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(new URL("/settings?tab=accounts&oauth_error=missing_params", req.nextUrl.origin))
    }

    console.log('🔐 Step 5: Verifying CSRF state')
    console.log('🔐 Verifying state for workspace:', workspaceId, 'platform: youtube, state:', state?.substring(0, 20) + '...')
    
    const stateVerification = await verifyOAuthState(workspaceId, "youtube", state)
    
    console.log('🔐 State verification result:', {
      valid: stateVerification.valid,
      error: stateVerification.error,
      hasCodeChallenge: !!stateVerification.codeChallenge,
    })
    
    if (!stateVerification.valid) {
      console.error('❌ CSRF check failed:', stateVerification.error)
      
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "youtube",
        action: "oauth_csrf_check_failed",
        status: "failed",
        errorMessage: stateVerification.error,
        errorCode: "CSRF_FAILED",
        metadata: {
          statePrefix: state?.substring(0, 20),
          workspaceId,
        },
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(new URL("/settings?tab=accounts&oauth_error=csrf_check_failed", req.nextUrl.origin))
    }
    
    console.log('✅ CSRF state verified successfully')

    const codeVerifier = req.cookies.get("oauth_youtube_verifier")?.value
    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=missing_verifier", req.nextUrl.origin)
      )
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    const callbackUrl = `${baseUrl}/api/auth/oauth/youtube/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=config_missing", req.nextUrl.origin)
      )
    }

    let tokenData: any
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl,
          code_verifier: codeVerifier,
        }).toString(),
      })

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed`)
      }
      tokenData = await tokenResponse.json()
      if (!tokenData.access_token) {
        throw new Error(`No access token`)
      }
    } catch (exchangeError) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=token_exchange_failed", req.nextUrl.origin)
      )
    }

    let youtubeUser: any
    try {
      const userResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenData.access_token}`,
        { method: "GET", headers: { "User-Agent": "SocialMediaOS/1.0" } }
      )
      if (!userResponse.ok) throw new Error(`Failed to fetch user`)
      youtubeUser = await userResponse.json()
    } catch (userError) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=get_user_failed", req.nextUrl.origin)
      )
    }

    const credentials: any = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      userId: youtubeUser.id,
      email: youtubeUser.email,
      username: youtubeUser.name || youtubeUser.email,
      profileImageUrl: youtubeUser.picture,
      isConnected: true,
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
    }

    try {
      await CredentialService.savePlatformCredentials("youtube", credentials, user.id, workspaceId)
    } catch (saveError) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=save_failed", req.nextUrl.origin)
      )
    }

    const response = NextResponse.redirect(
      new URL("/settings?tab=accounts&oauth_success=youtube", req.nextUrl.origin)
    )
    response.cookies.delete("oauth_youtube_verifier")
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: "youtube",
      action: "platform_connected",
      status: "success",
      ipAddress: ipAddress || undefined,
    })
    return response
  } catch (error) {
    const response = NextResponse.redirect(
      new URL("/settings?tab=accounts&oauth_error=callback_error", req.nextUrl.origin)
    )
    response.cookies.delete("oauth_youtube_verifier")
    return response
  }
}
