/**
 * Instagram - Post Content
 * POST /api/instagram/post
 *
 * Body: {
 *   caption: string,
 *   imageUrl: string, // Public URL to image
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createMediaContainer, createVideoContainer, publishMediaContainer, generateAppSecretProof } from '@/lib/instagram/client'
import { CredentialService } from '@/services/database'
import { InstagramCredentials } from '@/types'

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
    const { caption, imageUrl, mediaType } = body

    if (!caption || typeof caption !== 'string') {
      return NextResponse.json({ error: 'Caption is required' }, { status: 400 })
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Media URL is required for Instagram' }, { status: 400 })
    }

    // Detect if it's a video (by URL extension or explicit mediaType)
    const isVideo = mediaType === 'video' || 
                    imageUrl.includes('.mp4') || 
                    imageUrl.includes('.mov') ||
                    imageUrl.includes('video');

    // Validate caption length (2200 characters for Instagram)
    if (caption.length > 2200) {
      return NextResponse.json(
        { error: 'Caption exceeds 2200 characters' },
        { status: 400 }
      )
    }

    // Get Instagram credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'instagram',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('userId' in credentials)) {
      return NextResponse.json(
        { error: 'Instagram not connected' },
        { status: 400 }
      )
    }
    const instagramCreds = credentials as InstagramCredentials

    // Check if token is expired
    if (instagramCreds.expiresAt && new Date(instagramCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Generate appsecret_proof for server-to-server API calls
    // This is required by Facebook/Instagram Graph API for enhanced security
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET
    if (!appSecret) {
      return NextResponse.json(
        { error: 'Instagram app secret not configured' },
        { status: 500 }
      )
    }

    const appSecretProof = generateAppSecretProof(instagramCreds.accessToken, appSecret)

    // Step 1: Create media container (video or image)
    let container;
    if (isVideo) {
      container = await createVideoContainer(
        instagramCreds.userId!,
        instagramCreds.accessToken,
        imageUrl,
        caption,
        appSecretProof
      );
    } else {
      container = await createMediaContainer(
        instagramCreds.userId!,
        instagramCreds.accessToken,
        imageUrl,
        caption,
        appSecretProof
      );
    }

    // Step 2: Publish the container
    const published = await publishMediaContainer(
      instagramCreds.userId!,
      instagramCreds.accessToken,
      container.id,
      appSecretProof
    )

    // Generate post URL
    const postUrl = `https://www.instagram.com/p/${published.id}`

    return NextResponse.json({
      success: true,
      postId: published.id,
      postUrl,
      caption: caption,
    })
  } catch (error) {
    console.error('Instagram post error:', error)

    // Handle Instagram API errors
    const errorMessage = (error as any).message || 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to post to Instagram',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
