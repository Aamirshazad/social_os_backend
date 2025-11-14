/**
 * Instagram - Upload Media
 * POST /api/instagram/upload-media
 *
 * Body: {
 *   mediaData: string, // base64 encoded image
 * }
 *
 * Returns: { imageUrl: string } // Public URL for Instagram API
 * 
 * Note: Instagram requires images to be hosted at a publicly accessible URL
 * This endpoint uploads to Supabase Storage and returns the public URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
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
    const { mediaData } = body

    if (!mediaData) {
      return NextResponse.json(
        { error: 'mediaData is required' },
        { status: 400 }
      )
    }

    // Get Instagram credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'instagram',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials)) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }
    const instagramCreds = credentials as InstagramCredentials

    // Check if token is expired
    if (instagramCreds.expiresAt && new Date(instagramCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Convert base64 to Buffer
    const base64Data = mediaData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size (max 8MB for Instagram images)
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size exceeds 8MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileName = `instagram_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
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
      imageUrl: publicUrlData.publicUrl,
      fileName: fileName,
    })
  } catch (error) {
    console.error('Instagram media upload error:', error)

    // Handle errors
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
