/**
 * Facebook - Post Content
 * POST /api/facebook/post
 *
 * Body: {
 *   message: string,
 *   imageUrl?: string, // Optional image URL
 *   link?: string, // Optional link
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { postToFacebookPage, postPhotoToFacebookPage, uploadVideoToFacebookPage, generateAppSecretProof } from '@/lib/facebook/client'
import { CredentialService } from '@/services/database'
import { FacebookCredentials } from '@/types'

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
    const { message, imageUrl, link, mediaType } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Validate message length (63,206 characters for Facebook)
    if (message.length > 63206) {
      return NextResponse.json(
        { error: 'Message exceeds 63,206 characters' },
        { status: 400 }
      )
    }

    // Get Facebook credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'facebook',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('pageId' in credentials)) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      )
    }
    const facebookCreds = credentials as FacebookCredentials

    // Validate that pageId is set (not a group or other type)
    if (!facebookCreds.pageId) {
      return NextResponse.json(
        { error: 'Invalid Facebook configuration. Page ID is missing.' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (facebookCreds.expiresAt && new Date(facebookCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Generate appsecret_proof for server-to-server API calls
    // This is required by Facebook's Graph API for enhanced security
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET
    if (!appSecret) {
      return NextResponse.json(
        { error: 'Facebook app secret not configured' },
        { status: 500 }
      )
    }

    const appSecretProof = generateAppSecretProof(facebookCreds.accessToken, appSecret)

    let result: { id: string; post_id?: string };

    // Detect if it's a video
    const isVideo = mediaType === 'video' ||
                    (imageUrl && (imageUrl.includes('.mp4') || imageUrl.includes('.mov') || imageUrl.includes('video')));

    // Post with media if URL provided
    if (imageUrl && isVideo) {
      // Upload video
      result = await uploadVideoToFacebookPage(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        imageUrl,
        message,
        appSecretProof
      );
    } else if (imageUrl) {
      // Upload photo
      result = await postPhotoToFacebookPage(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        imageUrl,
        message,
        appSecretProof
      );
    } else {
      // Post text only or with link
      result = await postToFacebookPage(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        message,
        link,
        appSecretProof
      );
    }

    // Generate post URL (photo posts return post_id, text posts return id)
    const postId = result.post_id || result.id;
    const postUrl = `https://www.facebook.com/${postId}`

    return NextResponse.json({
      success: true,
      postId: postId,
      postUrl,
      message: message,
    })
  } catch (error) {
    console.error('Facebook post error:', error)

    // Handle Facebook API errors
    const errorMessage = (error as any).message || 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to post to Facebook',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
