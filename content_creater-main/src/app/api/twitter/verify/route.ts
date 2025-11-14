/**
 * Twitter - Verify Credentials
 * POST /api/twitter/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createUserTwitterClient } from '@/lib/twitter/client'
import { CredentialService } from '@/services/database'
import type { TwitterCredentials } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace_id
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string }>()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get Twitter credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'twitter',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('accessTokenSecret' in credentials)) {
      return NextResponse.json(
        { error: 'Twitter not connected', connected: false },
        { status: 400 }
      )
    }

    // Create Twitter client with user tokens
    const twitterCreds = credentials as TwitterCredentials
    const twitterClient = createUserTwitterClient(
      twitterCreds.accessToken,
      twitterCreds.accessTokenSecret
    )

    // Verify by fetching current user
    const twitterUser = await twitterClient.v2.me()

    return NextResponse.json({
      connected: true,
      username: twitterUser.data.username,
      name: twitterUser.data.name,
      id: twitterUser.data.id,
    })
  } catch (error) {
    console.error('Twitter verify error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify Twitter credentials',
        connected: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
