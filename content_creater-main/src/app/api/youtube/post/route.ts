/**
 * YouTube - Upload Video
 * POST /api/youtube/post
 *
 * Body: {
 *   title: string,
 *   description: string,
 *   videoBuffer: Buffer (base64 encoded),
 *   tags?: string[],
 *   privacyStatus?: 'public' | 'private' | 'unlisted',
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { YouTubeCredentials } from '@/types'
import { createYouTubeClient } from '@/lib/youtube/client'
import { logAuditEvent } from '@/services/database/auditLogService'

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

  try {
    console.log('🚀 YouTube upload request initiated')

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

    const workspaceId = userData.workspace_id

    // Get request body
    const body = await req.json()
    const { title, description, videoBuffer, tags, privacyStatus } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (!videoBuffer || typeof videoBuffer !== 'string') {
      return NextResponse.json({ error: 'Video buffer is required' }, { status: 400 })
    }

    // Validate title length (100 characters for YouTube)
    if (title.length > 100) {
      return NextResponse.json(
        { error: 'Title exceeds 100 characters' },
        { status: 400 }
      )
    }

    // Validate description length (5000 characters for YouTube)
    if (description.length > 5000) {
      return NextResponse.json(
        { error: 'Description exceeds 5000 characters' },
        { status: 400 }
      )
    }

    // Get YouTube credentials from database
    const credentialService = new CredentialService(supabase)
    const credentials = await credentialService.getPlatformCredentials(
      workspaceId,
      'youtube'
    )

    if (!credentials) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'youtube',
        action: 'upload_failed',
        status: 'failed',
        errorCode: 'NOT_CONNECTED',
        errorMessage: 'YouTube account not connected',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: 'YouTube not connected' },
        { status: 400 }
      )
    }

    const youTubeCreds = credentials as YouTubeCredentials

    // Verify and refresh token if needed
    await credentialService.verifyAndRefreshToken(workspaceId, 'youtube')

    // Get fresh credentials after potential refresh
    const freshCreds = await credentialService.getPlatformCredentials(
      workspaceId,
      'youtube'
    ) as YouTubeCredentials

    const clientId = process.env.YOUTUBE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/oauth/youtube/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'YouTube not configured' },
        { status: 500 }
      )
    }

    const youtubeClient = createYouTubeClient(clientId, clientSecret, redirectUri)

    // Convert base64 string to Buffer
    let videoBufferData: Buffer
    try {
      videoBufferData = Buffer.from(videoBuffer, 'base64')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid video buffer format' },
        { status: 400 }
      )
    }

    // Upload video to YouTube
    console.log('📤 Uploading video to YouTube...')
    const uploadResponse = await youtubeClient.uploadVideo(
      freshCreds.accessToken,
      {
        title,
        description,
        tags: tags || [],
        privacyStatus: (privacyStatus || 'private') as 'public' | 'private' | 'unlisted',
        categoryId: '22', // Default to Shorts
        buffer: videoBufferData,
        mimeType: 'video/mp4',
      }
    )

    const videoId = uploadResponse.id

    console.log('✅ Video uploaded successfully:', videoId)

    // Build video URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Log success
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'youtube',
      action: 'upload_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: {
        videoId,
        title: title.substring(0, 100),
        privacyStatus: privacyStatus || 'private',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        videoUrl,
        title,
        description,
        platform: 'youtube',
        status: privacyStatus || 'private',
      },
    })
  } catch (error) {
    console.error('❌ YouTube upload error:', error)

    // Attempt to log error
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('workspace_id')
          .eq('id', user.id)
          .maybeSingle()

        if (userRow) {
          await logAuditEvent({
            workspaceId: (userRow as any).workspace_id,
            userId: user.id,
            platform: 'youtube',
            action: 'upload_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'UPLOAD_ERROR',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
          })
        }
      }
    } catch (auditError) {
      console.error('Failed to log YouTube upload error:', auditError)
    }

    return NextResponse.json(
      { error: 'Failed to upload to YouTube' },
      { status: 500 }
    )
  }
}
