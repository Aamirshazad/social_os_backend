/**
 * LinkedIn - Upload Media
 * POST /api/linkedin/upload-media
 *
 * Body: {
 *   mediaData: string, // base64 encoded image or video
 *   mediaType: 'image' | 'video' // Type of media
 * }
 *
 * Returns: { mediaUrn: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { initializeImageUpload, uploadImageBinary, initializeVideoUpload, uploadVideoBinary } from '@/lib/linkedin/client'
import { CredentialService } from '@/services/database'
import { LinkedInCredentials } from '@/types'

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
    const { mediaData, mediaType = 'image' } = body

    if (!mediaData) {
      return NextResponse.json(
        { error: 'mediaData is required' },
        { status: 400 }
      )
    }

    if (!['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'mediaType must be either "image" or "video"' },
        { status: 400 }
      )
    }

    // Get LinkedIn credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'linkedin',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('profileId' in credentials)) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 })
    }
    const linkedInCreds = credentials as LinkedInCredentials

    // Check if token is expired
    if (linkedInCreds.expiresAt && new Date(linkedInCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Convert base64 to Buffer
    const base64Data = mediaData.replace(/^data:(image|video)\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size based on type
    const maxSize = mediaType === 'video' ? 200 * 1024 * 1024 : 10 * 1024 * 1024; // 200MB for video, 10MB for image
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: `${mediaType === 'video' ? 'Video' : 'Image'} size exceeds ${mediaType === 'video' ? '200MB' : '10MB'} limit` },
        { status: 400 }
      )
    }

    let uploadUrl: string;
    let asset: string;

    // Step 1: Initialize upload based on media type
    if (mediaType === 'video') {
      const videoUpload = await initializeVideoUpload(
        linkedInCreds.accessToken,
        linkedInCreds.profileId!
      );
      uploadUrl = videoUpload.uploadUrl;
      asset = videoUpload.asset;
      
      // Step 2: Upload video binary
      await uploadVideoBinary(uploadUrl, buffer, linkedInCreds.accessToken);
    } else {
      const imageUpload = await initializeImageUpload(
        linkedInCreds.accessToken,
        linkedInCreds.profileId!
      );
      uploadUrl = imageUpload.uploadUrl;
      asset = imageUpload.asset;
      
      // Step 2: Upload image binary
      await uploadImageBinary(uploadUrl, buffer, linkedInCreds.accessToken);
    }

    // Return the asset URN
    return NextResponse.json({
      success: true,
      mediaUrn: asset,
      mediaType: mediaType,
    })
  } catch (error) {
    console.error('LinkedIn media upload error:', error)

    // Handle LinkedIn API errors
    const errorMessage = (error as any).message || 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to upload media',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
