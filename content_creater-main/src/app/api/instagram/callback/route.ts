/**
 * Instagram OAuth - Handle Callback
 * GET /api/instagram/callback?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  exchangeCodeForToken, 
  getLongLivedToken,
  getFacebookPages,
  getInstagramBusinessAccount,
  getInstagramAccountInfo 
} from '@/lib/instagram/client'
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
        new URL(`/?error=instagram_oauth_denied&details=${encodeURIComponent(error)}`, req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=missing_oauth_params', req.url))
    }

    // Verify state parameter (CSRF protection)
    const storedState = req.cookies.get('instagram_oauth_state')?.value

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/?error=invalid_state', req.url))
    }

    // Get Instagram/Facebook credentials from environment
    const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_CLIENT_ID
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_CLIENT_SECRET

    if (!appId || !appSecret) {
      return NextResponse.redirect(new URL('/?error=instagram_config_missing', req.url))
    }

    // Get callback URL (ensure no double slash)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
    const callbackURL = `${baseUrl}/api/instagram/callback`

    // Exchange code for short-lived access token
    const tokenData = await exchangeCodeForToken(code, appId, appSecret, callbackURL)

    // Exchange for long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(tokenData.access_token, appId, appSecret)

    // Get Facebook Pages
    const pages = await getFacebookPages(longLivedToken.access_token)

    if (!pages.data || pages.data.length === 0) {
      return NextResponse.redirect(
        new URL('/?error=no_facebook_pages&details=No Facebook Pages found. Please create a Facebook Page and connect it to your Instagram Business account.', req.url)
      )
    }

    // Try to find Instagram Business Account from any of the pages
    let instagramUserId: string | null = null
    let pageAccessToken: string | null = null
    let pageName: string | null = null

    for (const page of pages.data) {
      const igAccount = await getInstagramBusinessAccount(page.id, page.access_token)
      if (igAccount) {
        instagramUserId = igAccount
        pageAccessToken = page.access_token
        pageName = page.name
        break
      }
    }

    if (!instagramUserId || !pageAccessToken) {
      return NextResponse.redirect(
        new URL('/?error=no_instagram_business&details=No Instagram Business Account found. Please connect your Instagram Business account to your Facebook Page.', req.url)
      )
    }

    // Get Instagram account info
    const igAccountInfo = await getInstagramAccountInfo(instagramUserId, pageAccessToken)

    // Calculate token expiration (60 days)
    const expiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString()

    // Save credentials to database (encrypted)
    const credentials = {
      accessToken: pageAccessToken,
      userId: instagramUserId,
      username: igAccountInfo.username,
      expiresAt: expiresAt,
      isConnected: true,
      connectedAt: new Date().toISOString(),
    }

    await CredentialService.savePlatformCredentials(
      'instagram',
      credentials,
      user.id,
      userRow.workspace_id
    )

    // Clear the state cookie
    const response = NextResponse.redirect(new URL('/?instagram_connected=true', req.url))
    response.cookies.delete('instagram_oauth_state')

    return response
  } catch (error) {
    console.error('Instagram callback error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const response = NextResponse.redirect(
      new URL(
        `/?error=instagram_auth_failed&details=${encodeURIComponent(errorMessage)}`,
        req.url
      )
    )
    // Clear the state cookie on error too
    response.cookies.delete('instagram_oauth_state')
    return response
  }
}
