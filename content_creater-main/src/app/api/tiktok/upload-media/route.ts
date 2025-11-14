/**
 * TikTok - Upload Media
 * POST /api/tiktok/upload-media
 *
 * Body: {
 *   videoData: string, // base64 encoded video or public URL
 * }
 *
 * Returns: { videoUrl: string, videoSize: number }
 *
 * Note: TikTok accepts public URLs for videos
 * This endpoint uploads to Supabase Storage and returns the public URL
 * Follows the same pattern as /api/facebook/upload-media
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { TikTokCredentials } from '@/types'

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

  try {
    // ✅ Step 1: Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to upload media',
          status: 401
        },
        { status: 401 }
      )
    }

    // ✅ Step 2: Get workspace and verify user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('workspace_id, role')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string; role: string }>()

    if (userError || !userData) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          message: 'Your user profile could not be found. Please try logging out and back in.',
          status: 404
        },
        { status: 404 }
      )
    }

    const workspaceId = userData.workspace_id

    // ✅ Step 3: Get request body
    let body: any
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON',
          status: 400
        },
        { status: 400 }
      )
    }

    const { videoData } = body

    if (!videoData) {
      return NextResponse.json(
        {
          error: 'Missing videoData',
          code: 'MISSING_VIDEO_DATA',
          message: 'videoData field is required in request body',
          status: 400
        },
        { status: 400 }
      )
    }

    // ✅ Step 4: Get TikTok credentials from database
    const credentialService = new CredentialService(supabase)
    const credentials = await credentialService.getPlatformCredentials(
      workspaceId,
      'tiktok'
    )

    if (!credentials) {
      return NextResponse.json(
        {
          error: 'TikTok not connected',
          code: 'PLATFORM_NOT_CONNECTED',
          message: 'Please connect your TikTok account in Settings → Account Connections',
          status: 403
        },
        { status: 403 }
      )
    }

    if (!('accessToken' in credentials)) {
      return NextResponse.json(
        {
          error: 'Invalid TikTok credentials',
          code: 'INVALID_CREDENTIALS',
          message: 'TikTok credentials are corrupted. Please reconnect your account.',
          status: 400
        },
        { status: 400 }
      )
    }

    const tikTokCreds = credentials as TikTokCredentials

    // ✅ Step 5: Check if token is expired
    if (tikTokCreds.expiresAt && new Date(tikTokCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Your TikTok access token has expired. Please reconnect your account in Settings → Account Connections',
          status: 401,
          expired: true
        },
        { status: 401 }
      )
    }

    // If it's already a public URL, return it directly
    if (videoData.startsWith('http')) {
      return NextResponse.json({
        success: true,
        videoUrl: videoData,
        videoSize: 0,
      })
    }

    // Convert base64 to Buffer
    const base64Data = videoData.replace(/^data:video\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size (max 287MB for TikTok, but we'll limit to 100MB for practical reasons)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: `Video size exceeds ${MAX_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileName = `tiktok_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('media')
      .getPublicUrl(fileName)

    if (!publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL')
    }

    // Return the public URL
    return NextResponse.json({
      success: true,
      videoUrl: publicUrlData.publicUrl,
      videoSize: buffer.length,
      fileName: fileName,
    })
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = (error as any).message || 'Unknown error'
    const errorCode = (error as any).code || 'UPLOAD_ERROR'

    // Log error for debugging
    console.error('TikTok upload error:', {
      error: errorMessage,
      code: errorCode,
      ipAddress: ipAddress || 'unknown',
      timestamp: new Date().toISOString()
    })

    // Provide helpful error responses based on error type
    if (errorMessage.includes('Failed to upload to storage')) {
      return NextResponse.json(
        {
          error: 'Storage upload failed',
          code: 'STORAGE_ERROR',
          message: 'Failed to upload video to storage. Please try again or contact support.',
          details: errorMessage
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('Failed to get public URL')) {
      return NextResponse.json(
        {
          error: 'URL generation failed',
          code: 'URL_ERROR',
          message: 'Failed to generate public URL for video. Please try again.',
          details: errorMessage
        },
        { status: 500 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Upload failed',
        code: errorCode,
        message: 'An unexpected error occurred during upload. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
