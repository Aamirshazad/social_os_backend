/**
 * TikTok - Post Content
 * POST /api/tiktok/post
 *
 * Body: {
 *   caption: string,
 *   videoUrl: string, // Publicly accessible video URL
 *   videoSize: number, // Size in bytes
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { TikTokCredentials } from '@/types'
import { createTikTokClient } from '@/lib/tiktok/client'
import { logAuditEvent } from '@/services/database/auditLogService'

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

  try {
    console.log('🚀 TikTok post request initiated')

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
    const { caption, videoUrl, videoSize } = body

    if (!caption || typeof caption !== 'string') {
      return NextResponse.json({ error: 'Caption is required' }, { status: 400 })
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
    }

    if (!videoSize || typeof videoSize !== 'number') {
      return NextResponse.json({ error: 'Video size is required' }, { status: 400 })
    }

    // Validate caption length (2200 characters for TikTok)
    if (caption.length > 2200) {
      return NextResponse.json(
        { error: 'Caption exceeds 2200 characters' },
        { status: 400 }
      )
    }

    // Get TikTok credentials from database
    const credentialService = new CredentialService(supabase)
    const credentials = await credentialService.getPlatformCredentials(
      workspaceId,
      'tiktok'
    )

    if (!credentials) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'tiktok',
        action: 'post_failed',
        status: 'failed',
        errorCode: 'NOT_CONNECTED',
        errorMessage: 'TikTok account not connected',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: 'TikTok not connected' },
        { status: 400 }
      )
    }

    const tikTokCreds = credentials as TikTokCredentials

    // Verify and refresh token if needed
    await credentialService.verifyAndRefreshToken(workspaceId, 'tiktok')

    // Get fresh credentials after potential refresh
    const freshCreds = await credentialService.getPlatformCredentials(
      workspaceId,
      'tiktok'
    ) as TikTokCredentials

    const clientKey = process.env.TIKTOK_CLIENT_KEY
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/oauth/tiktok/callback`

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: 'TikTok not configured' },
        { status: 500 }
      )
    }

    const tiktokClient = createTikTokClient(clientKey, clientSecret, redirectUri)

    // Step 1: Create video upload
    console.log('📤 Creating TikTok video upload...')
    const uploadResponse = await tiktokClient.createVideoUpload(
      freshCreds.accessToken,
      freshCreds.openId!,
      {
        caption,
        videoUrl,
        videoSize,
        mimeType: 'video/mp4',
      }
    )

    const uploadId = uploadResponse.data.video_id

    console.log('✅ Video upload created:', uploadId)

    // Step 2: Publish the video
    console.log('📤 Publishing TikTok video...')
    const publishResponse = await tiktokClient.publishVideo(
      freshCreds.accessToken,
      uploadId,
      caption
    )

    const videoId = publishResponse.data.video_id
    const shareUrl = publishResponse.data.share_url || `https://www.tiktok.com/@${freshCreds.username}/video/${videoId}`

    console.log('✅ Video published successfully:', videoId)

    // Log success
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'tiktok',
      action: 'post_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: {
        videoId,
        caption: caption.substring(0, 100),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        shareUrl,
        caption,
        platform: 'tiktok',
      },
    })
  } catch (error) {
    console.error('❌ TikTok post error:', error)

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
            platform: 'tiktok',
            action: 'post_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'POST_ERROR',
            ipAddress: ipAddress || undefined,
          })
        }
      }
    } catch (auditError) {
      console.error('Failed to log TikTok post error:', auditError)
    }

    return NextResponse.json(
      { error: 'Failed to post to TikTok' },
      { status: 500 }
    )
  }
}
