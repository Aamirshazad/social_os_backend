/**
 * Facebook OAuth - Handle Callback
 * GET /api/facebook/callback?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  exchangeCodeForToken, 
  getLongLivedToken,
  getFacebookPages,
  getPageInfo 
} from '@/lib/facebook/client'
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
        new URL(`/?error=facebook_oauth_denied&details=${encodeURIComponent(error)}`, req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=missing_oauth_params', req.url))
    }

    // Verify state parameter (CSRF protection)
    const storedState = req.cookies.get('facebook_oauth_state')?.value

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/?error=invalid_state', req.url))
    }

    // Get Facebook credentials from environment
    const appId = process.env.FACEBOOK_CLIENT_ID
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET

    if (!appId || !appSecret) {
      return NextResponse.redirect(new URL('/?error=facebook_config_missing', req.url))
    }

    // Get callback URL (ensure no double slash)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
    const callbackURL = `${baseUrl}/api/facebook/callback`

    // Exchange code for short-lived access token
    const tokenData = await exchangeCodeForToken(code, appId, appSecret, callbackURL)

    // Exchange for long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(tokenData.access_token, appId, appSecret)

    // Get Facebook Pages
    const pages = await getFacebookPages(longLivedToken.access_token)

    if (!pages.data || pages.data.length === 0) {
      return NextResponse.redirect(
        new URL('/?error=no_facebook_pages&details=No Facebook Pages found. Please create a Facebook Page to post content.', req.url)
      )
    }

    // Use the first page (or let user select in future enhancement)
    const selectedPage = pages.data[0]

    // Get page info
    const pageInfo = await getPageInfo(selectedPage.id, selectedPage.access_token)

    // Calculate token expiration (60 days)
    const expiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString()

    // Save credentials to database (encrypted)
    const credentials = {
      appId: appId,
      appSecret: appSecret,
      accessToken: selectedPage.access_token, // Page access token
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      expiresAt: expiresAt,
      isConnected: true,
      connectedAt: new Date().toISOString(),
    }

    await CredentialService.savePlatformCredentials(
      'facebook',
      credentials,
      user.id,
      userRow.workspace_id
    )

    // Clear the state cookie
    const response = NextResponse.redirect(new URL('/?facebook_connected=true', req.url))
    response.cookies.delete('facebook_oauth_state')

    return response
  } catch (error) {
    console.error('Facebook callback error:', error)
    const response = NextResponse.redirect(
      new URL(
        `/?error=facebook_auth_failed&details=${encodeURIComponent((error as Error).message)}`,
        req.url
      )
    )
    // Clear the state cookie on error too
    response.cookies.delete('facebook_oauth_state')
    return response
  }
}
