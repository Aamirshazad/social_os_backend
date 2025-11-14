/**
 * Twitter OAuth - Handle Callback
 * GET /api/twitter/callback?oauth_token=xxx&oauth_verifier=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createTwitterClient } from '@/lib/twitter/client'
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
    const oauth_token = searchParams.get('oauth_token')
    const oauth_verifier = searchParams.get('oauth_verifier')

    if (!oauth_token || !oauth_verifier) {
      return NextResponse.redirect(new URL('/?error=missing_oauth_params', req.url))
    }

    // Get oauth_token_secret from cookie
    const oauth_token_secret = req.cookies.get('twitter_oauth_token_secret')?.value

    if (!oauth_token_secret) {
      return NextResponse.redirect(new URL('/?error=missing_token_secret', req.url))
    }

    // Create Twitter client with temporary tokens
    const twitterClient = createTwitterClient()

    // Exchange for access tokens
    const { client: loggedClient, accessToken, accessSecret } = await twitterClient.login(
      oauth_verifier
    )

    // Verify the credentials by fetching user info
    const twitterUser = await loggedClient.v2.me()

    // Save credentials to database (encrypted)
    const credentials = {
      apiKey: process.env.TWITTER_API_KEY!,
      apiSecret: process.env.TWITTER_API_SECRET!,
      accessToken,
      accessTokenSecret: accessSecret,
      isConnected: true,
      username: twitterUser.data.username,
      connectedAt: new Date().toISOString(),
    }

    await CredentialService.savePlatformCredentials(
      'twitter',
      credentials,
      user.id,
      userRow.workspace_id
    )

    // Clear the temporary cookie
    const response = NextResponse.redirect(new URL('/?twitter_connected=true', req.url))
    response.cookies.delete('twitter_oauth_token_secret')

    return response
  } catch (error) {
    console.error('Twitter callback error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const response = NextResponse.redirect(
      new URL(`/?error=twitter_auth_failed&details=${encodeURIComponent(errorMessage)}`, req.url)
    )
    // Clear the temporary cookie on error too
    response.cookies.delete('twitter_oauth_token_secret')
    return response
  }
}
