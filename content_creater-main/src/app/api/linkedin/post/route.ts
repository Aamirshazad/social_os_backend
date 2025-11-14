/**
 * LinkedIn - Post Content
 * POST /api/linkedin/post
 *
 * Body: {
 *   text: string,
 *   visibility?: 'PUBLIC' | 'CONNECTIONS',
 *   mediaUrn?: string, // From upload-media endpoint
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { postToLinkedIn } from '@/lib/linkedin/client'
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
    const { text, visibility = 'PUBLIC', mediaUrn } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Validate text length (3000 characters for LinkedIn)
    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'Post text exceeds 3000 characters' },
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
      return NextResponse.json(
        { error: 'LinkedIn not connected' },
        { status: 400 }
      )
    }
    const linkedInCreds = credentials as LinkedInCredentials

    // Check if token is expired
    if (linkedInCreds.expiresAt && new Date(linkedInCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Post to LinkedIn
    const result = await postToLinkedIn(
      linkedInCreds.accessToken,
      linkedInCreds.profileId!,
      text,
      visibility,
      mediaUrn
    )

    // Generate post URL
    const postUrl = `https://www.linkedin.com/feed/update/${result.id}`

    return NextResponse.json({
      success: true,
      postId: result.id,
      postUrl,
      text: text,
    })
  } catch (error) {
    console.error('LinkedIn post error:', error)

    // Handle LinkedIn API errors
    const errorMessage = (error as any).message || 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to post to LinkedIn',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
