/**
 * LinkedIn OAuth - Handle Callback
 * GET /api/linkedin/callback?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { exchangeCodeForToken, getLinkedInProfile, getLinkedInUserUrn } from '@/lib/linkedin/client'
import { CredentialService } from '@/services/database'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
    }

    // Get workspace_id
    const { data: userRow } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string }>()

    if (!userRow) {
      return NextResponse.redirect(new URL('/?error=no_workspace', req.url))
    }

    // Get OAuth parameters from URL
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=linkedin_oauth_denied&details=${encodeURIComponent(error)}`, req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=missing_oauth_params', req.url))
    }

    // Verify state parameter (CSRF protection)
    const storedState = req.cookies.get('linkedin_oauth_state')?.value

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/?error=invalid_state', req.url))
    }

    // Get LinkedIn credentials from environment
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/?error=linkedin_config_missing', req.url))
    }

    // Get callback URL (ensure no double slash)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
    const callbackURL = `${baseUrl}/api/linkedin/callback`

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code, clientId, clientSecret, callbackURL)

    // Get user profile
    const profile = await getLinkedInProfile(tokenData.access_token)

    // Get user URN for posting
    const userUrn = await getLinkedInUserUrn(tokenData.access_token)

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Save credentials to database (encrypted)
    const credentials = {
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: expiresAt,
      isConnected: true,
      profileId: userUrn,
      profileName: profile.name,
      connectedAt: new Date().toISOString(),
    }

    await CredentialService.savePlatformCredentials(
      'linkedin',
      credentials,
      user.id,
      userRow.workspace_id
    )

    // Clear the state cookie
    const response = NextResponse.redirect(new URL('/?linkedin_connected=true', req.url))
    response.cookies.delete('linkedin_oauth_state')

    return response
  } catch (error) {
    console.error('LinkedIn callback error:', error)
    const response = NextResponse.redirect(
      new URL(
        `/?error=linkedin_auth_failed&details=${encodeURIComponent((error as Error).message)}`,
        req.url
      )
    )
    // Clear the state cookie on error too
    response.cookies.delete('linkedin_oauth_state')
    return response
  }
}
