/**
 * LinkedIn OAuth Callback
 * GET /api/auth/oauth/linkedin/callback?code=xxx&state=xxx
 *
 * Handles OAuth callback from LinkedIn using OpenID Connect
 *
 * IMPORTANT SETUP REQUIREMENTS in LinkedIn Developer Portal:
 * 1. Ensure "Sign in with LinkedIn using OpenID Connect" product is enabled
 * 2. To enable posting to LinkedIn, also enable "Share on LinkedIn" product
 * 3. Verify these scopes are authorized:
 *    - openid (required for OIDC)
 *    - profile (user profile info)
 *    - email (email address)
 *    - w_member_social (only if ShareOnLinkedIn product is enabled)
 * 4. Error "Bummer, something went wrong" usually means:
 *    - Wrong scopes configured in code vs Developer Portal
 *    - ShareOnLinkedIn product enabled but w_member_social scope not setup
 *    - App permissions not properly configured
 *
 * Flow:
 * - Verifies CSRF state
 * - Exchanges code for token
 * - Gets user profile via OpenID Connect userinfo endpoint
 * - Saves credentials securely
 * - NEVER stores API secrets or Client Secret
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyOAuthState } from '@/services/database/oauthStateService'
import { CredentialService } from '@/services/database/credentialService'
import { logAuditEvent } from '@/services/database/auditLogService'

export async function GET(req: NextRequest) {
  console.log('🚀 LinkedIn OAuth Callback started')
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

  console.log('📥 Callback params:', {
    code: code?.substring(0, 20) + '...',
    state: state?.substring(0, 20) + '...',
    error,
  })

  try {
    // ✅ Step 1: Check authentication
    console.log('✅ Step 1: Checking authentication')
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('❌ No authenticated user found')
      return NextResponse.redirect(
        new URL('/?error=oauth_unauthorized', req.nextUrl.origin)
      )
    }
    console.log('✅ User authenticated:', user.id)

    // ✅ Step 2: Get workspace and verify admin role using RPC to avoid RLS recursion
    console.log('✅ Step 2: Getting workspace and verifying admin role')
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
    
    if (rpcError || !rpcData) {
      console.log('❌ No user profile found via RPC:', rpcError)
      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=no_workspace', req.nextUrl.origin)
      )
    }

    const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const workspaceId = profileData?.workspace_id
    const userRole = profileData?.role || 'admin'

    if (!workspaceId) {
      console.log('❌ No workspace_id found')
      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=no_workspace', req.nextUrl.origin)
      )
    }
    
    console.log('✅ User workspace:', workspaceId, 'Role:', userRole)

    // Check if user is admin (required for OAuth connections)
    if (userRole !== 'admin') {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'linkedin',
        action: 'oauth_callback_unauthorized',
        status: 'failed',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=insufficient_permissions', req.nextUrl.origin)
      )
    }

    // ✅ Step 3: Check for OAuth denial
    if (error) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'linkedin',
        action: 'oauth_user_denied',
        status: 'failed',
        errorCode: error,
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=user_denied', req.nextUrl.origin)
      )
    }

    // ✅ Step 4: Validate parameters
    if (!code || !state) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'linkedin',
        action: 'oauth_missing_params',
        status: 'failed',
        errorCode: 'MISSING_PARAMS',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=missing_params', req.nextUrl.origin)
      )
    }

    // ✅ Step 5: Verify CSRF state
    console.log('🔐 Step 5: Verifying CSRF state')
    console.log('🔐 Verifying state for workspace:', workspaceId, 'platform: linkedin, state:', state?.substring(0, 20) + '...')
    
    const stateVerification = await verifyOAuthState(workspaceId, 'linkedin', state)
    
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
        platform: 'linkedin',
        action: 'oauth_csrf_check_failed',
        status: 'failed',
        errorMessage: stateVerification.error,
        errorCode: 'CSRF_FAILED',
        metadata: {
          statePrefix: state?.substring(0, 20),
          workspaceId,
        },
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=csrf_check_failed', req.nextUrl.origin)
      )
    }
    
    console.log('✅ CSRF state verified successfully')

    // ✅ Step 6: Exchange code for token
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const callbackUrl = `${baseUrl}/api/auth/oauth/linkedin/callback`

    if (!clientId || !clientSecret) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'linkedin',
        action: 'oauth_config_missing',
        status: 'failed',
        errorCode: 'CONFIG_MISSING',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=config_missing', req.nextUrl.origin)
      )
    }

    let tokenData: any
    try {
      console.log('🔐 Step 6: Exchanging LinkedIn auth code for access token')
      console.log('Parameters:', {
        code: code?.substring(0, 20) + '...',
        clientId: clientId?.substring(0, 10) + '...',
        callbackUrl,
      })

      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
        }),
      })

      console.log('🔐 Token exchange response status:', tokenResponse.status, tokenResponse.statusText)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('🔐 Token exchange error response:', errorText)

        let errorMessage = tokenResponse.statusText
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error_description || errorData.error || tokenResponse.statusText
        } catch (e) {
          errorMessage = errorText || tokenResponse.statusText
        }

        throw new Error(`Token exchange failed: ${errorMessage}`)
      }

      tokenData = await tokenResponse.json()
      console.log('🔐 Token exchange successful')

      if (!tokenData.access_token) {
        throw new Error(`No access token in response. Keys: ${Object.keys(tokenData).join(', ')}`)
      }
    } catch (exchangeError) {
      console.error('❌ Token exchange error:', exchangeError)

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'linkedin',
        action: 'oauth_token_exchange_failed',
        status: 'failed',
        errorMessage: exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
        errorCode: 'TOKEN_EXCHANGE_FAILED',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=token_exchange_failed', req.nextUrl.origin)
      )
    }

    // ✅ Step 7: Get user profile using OpenID Connect userinfo endpoint
    // LinkedIn now uses userinfo endpoint for OpenID Connect
    let profileName = 'LinkedIn User'
    let profileId = null
    let userEmail = null

    try {
      console.log('👤 Step 7: Getting LinkedIn user profile via OpenID Connect userinfo endpoint')

      // Use the OpenID Connect userinfo endpoint (recommended for new apps)
      const profileResponse = await fetch(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        }
      )

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        console.log('👤 LinkedIn userinfo response:', JSON.stringify(profileData, null, 2))

        // Extract user info from OpenID Connect response
        profileName = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim() || 'LinkedIn User'
        profileId = profileData.sub // sub is the user identifier in OIDC
        userEmail = profileData.email

        console.log('👤 LinkedIn profile retrieved:', { profileName, profileId, userEmail })
      } else {
        const errorText = await profileResponse.text()
        console.warn('⚠️ Failed to get profile via userinfo endpoint:', profileResponse.status, errorText)

        // Fallback to older v2 endpoint if userinfo fails
        console.log('⚠️ Falling back to v2/me endpoint...')
        try {
          const fallbackResponse = await fetch(
            'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName)',
            {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
              },
            }
          )

          if (fallbackResponse.ok) {
            const profileData = await fallbackResponse.json()
            const firstName = profileData.firstName?.localized?.[Object.keys(profileData.firstName.localized)[0]] || ''
            const lastName = profileData.lastName?.localized?.[Object.keys(profileData.lastName.localized)[0]] || ''
            profileName = `${firstName} ${lastName}`.trim() || 'LinkedIn User'
            profileId = profileData.id
            console.log('✅ Profile retrieved via fallback endpoint')
          } else {
            const fallbackErrorText = await fallbackResponse.text()
            console.warn('⚠️ Fallback endpoint also failed:', fallbackResponse.status, fallbackErrorText)
            console.log('⚠️ Continuing with default profile name and no profileId')
          }
        } catch (fallbackError) {
          console.warn('⚠️ Exception during fallback request:', fallbackError)
          console.log('⚠️ Continuing with default profile name and no profileId')
        }
      }
    } catch (profileError) {
      console.warn('❌ Failed to get profile:', profileError)
      console.log('⚠️ Continuing with default profile name and no profileId')
      // Continue with default profile name
    }

    // ✅ Step 8: Get user URN for posting
    let userUrn = null
    try {
      if (profileId) {
        // If we have profileId from userinfo (OIDC format like "ACoAA...")
        // It's already in the correct format to create URN
        userUrn = `urn:li:person:${profileId}`
        console.log('✅ User URN created:', userUrn)
      }
    } catch (urnError) {
      console.warn('⚠️ Failed to create user URN:', urnError)
    }

    // ✅ Step 9: Build credentials object
    // IMPORTANT: DO NOT store clientSecret!
    const credentials: any = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      profileId: userUrn || profileId,
      profileName: profileName,
      tokenType: tokenData.token_type || 'Bearer',
      isConnected: true,
      connectedAt: new Date().toISOString(),
    }

    // LinkedIn access tokens expire in 60 days
    if (tokenData.expires_in) {
      credentials.expiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      ).toISOString()
    } else {
      credentials.expiresAt = new Date(
        Date.now() + 60 * 24 * 60 * 60 * 1000
      ).toISOString()
    }

    // ✅ Step 10: Save credentials
    try {
      console.log('💾 Step 10: Saving LinkedIn credentials to database...')
      console.log('💾 Credentials summary:', {
        hasAccessToken: !!credentials.accessToken,
        hasRefreshToken: !!credentials.refreshToken,
        profileId: credentials.profileId,
        profileName: credentials.profileName,
        workspaceId,
        userId: user.id,
      })
      
      await CredentialService.savePlatformCredentials(
        'linkedin',
        credentials,
        user.id,
        workspaceId
      )
      
      console.log('✅ LinkedIn credentials saved successfully to database')
    } catch (saveError) {
      console.error('❌ Failed to save credentials:', saveError)

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'linkedin',
        action: 'oauth_save_credentials_failed',
        status: 'failed',
        errorMessage: saveError instanceof Error ? saveError.message : String(saveError),
        errorCode: 'SAVE_CREDENTIALS_FAILED',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=save_failed', req.nextUrl.origin)
      )
    }

    // ✅ Step 11: Success
    const response = NextResponse.redirect(
      new URL('/settings?tab=accounts&oauth_success=linkedin', req.nextUrl.origin)
    )

    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'linkedin',
      action: 'platform_connected',
      status: 'success',
      metadata: {
        profileName,
        hasRefreshToken: !!tokenData.refresh_token,
      },
      ipAddress: ipAddress || undefined,
    })

    return response
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('workspace_id')
          .eq('id', user.id)
          .maybeSingle()

        if (userRow) {
          await logAuditEvent({
            workspaceId: (userRow as any).workspace_id,
            userId: user.id,
            platform: 'linkedin',
            action: 'oauth_callback_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'CALLBACK_ERROR',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
          })
        }
      }
    } catch (auditError) {
      console.error('Failed to log error:', auditError)
    }

    return NextResponse.redirect(
      new URL('/settings?tab=accounts&oauth_error=callback_error', req.nextUrl.origin)
    )
  }
}
