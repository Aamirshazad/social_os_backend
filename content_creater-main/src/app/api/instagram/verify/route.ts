/**
 * Instagram - Verify Credentials
 * POST /api/instagram/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getInstagramAccountInfo, generateAppSecretProof } from '@/lib/instagram/client'
import { CredentialService } from '@/services/database'
import type { InstagramCredentials } from '@/types'

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

    // Get Instagram credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'instagram',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('userId' in credentials)) {
      return NextResponse.json(
        { error: 'Instagram not connected', connected: false },
        { status: 400 }
      )
    }

    const instagramCreds = credentials as InstagramCredentials

    // Check if token is expired
    if (instagramCreds.expiresAt && new Date(instagramCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { 
          error: 'Access token expired. Please reconnect.', 
          connected: false,
          expired: true
        },
        { status: 400 }
      )
    }

    // Verify by fetching account info
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET
    if (!appSecret) {
      throw new Error('Facebook app secret not configured')
    }

    const appSecretProof = generateAppSecretProof(instagramCreds.accessToken, appSecret)
    const accountInfo = await getInstagramAccountInfo(
      instagramCreds.userId!,
      instagramCreds.accessToken,
      appSecretProof
    )

    return NextResponse.json({
      connected: true,
      username: accountInfo.username,
      userId: accountInfo.id,
      name: accountInfo.name,
    })
  } catch (error) {
    console.error('Instagram verify error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify Instagram credentials',
        connected: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
