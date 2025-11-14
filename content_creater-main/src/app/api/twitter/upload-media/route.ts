/**
 * Twitter - Upload Media
 * POST /api/twitter/upload-media
 *
 * Body: {
 *   mediaData: string, // base64 encoded image or video
 *   mediaType: 'image' | 'video'
 * }
 *
 * Returns: { mediaId: string }
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
    const { mediaData, mediaType } = body

    if (!mediaData || !mediaType) {
      return NextResponse.json(
        { error: 'mediaData and mediaType are required' },
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
      return NextResponse.json({ error: 'Twitter not connected' }, { status: 400 })
    }
    const twitterCreds = credentials as TwitterCredentials

    // Create Twitter client with user tokens
    const twitterClient = createUserTwitterClient(
      twitterCreds.accessToken,
      twitterCreds.accessTokenSecret
    )

    // Convert base64 to Buffer
    const base64Data = mediaData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload media to Twitter
    const mediaId = await twitterClient.v1.uploadMedia(buffer, {
      mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
    })

    return NextResponse.json({
      success: true,
      mediaId,
    })
  } catch (error) {
    console.error('Twitter media upload error:', error)

    // Handle Twitter API errors
    const errorMessage = (error as any).data?.detail || (error as Error).message

    return NextResponse.json(
      {
        error: 'Failed to upload media',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
