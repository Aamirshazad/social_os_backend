/**
 * Twitter - Post Tweet
 * POST /api/twitter/post
 *
 * Body: {
 *   text: string,
 *   mediaIds?: string[], // IDs from media upload endpoint
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createUserTwitterClient } from '@/lib/twitter/client'
import { CredentialService } from '@/services/database'
import { TwitterCredentials } from '@/types'

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

    // Get request body
    const body = await req.json()
    const { text, mediaIds } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Validate text length (280 characters for Twitter)
    if (text.length > 280) {
      return NextResponse.json(
        { error: 'Tweet text exceeds 280 characters' },
        { status: 400 }
      )
    }

    // Get Twitter credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'twitter',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('accessTokenSecret' in credentials)) {
      return NextResponse.json(
        { error: 'Twitter not connected' },
        { status: 400 }
      )
    }
    const twitterCreds = credentials as TwitterCredentials

    // Create Twitter client with user tokens
    const twitterClient = createUserTwitterClient(
      twitterCreds.accessToken,
      twitterCreds.accessTokenSecret
    )

    // Post tweet
    const tweetPayload: any = { text }

    // Add media if provided
    if (mediaIds && Array.isArray(mediaIds) && mediaIds.length > 0) {
      tweetPayload.media = {
        media_ids: mediaIds,
      }
    }

    const tweet = await twitterClient.v2.tweet(tweetPayload)

    // Generate tweet URL
    const tweetUrl = `https://twitter.com/${twitterCreds.username}/status/${tweet.data.id}`

    return NextResponse.json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl,
      text: tweet.data.text,
    })
  } catch (error) {
    console.error('Twitter post error:', error)

    // Handle Twitter API errors
    const errorMessage = (error as any).data?.detail || (error as Error).message

    return NextResponse.json(
      {
        error: 'Failed to post tweet',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
