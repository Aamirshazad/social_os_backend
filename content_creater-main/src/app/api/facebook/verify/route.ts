/**
 * Facebook - Verify Credentials
 * POST /api/facebook/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getPageInfo, generateAppSecretProof } from '@/lib/facebook/client'
import { CredentialService } from '@/services/database'
import type { FacebookCredentials } from '@/types'

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

    // Get Facebook credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'facebook',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('pageId' in credentials)) {
      return NextResponse.json(
        { error: 'Facebook not connected', connected: false },
        { status: 400 }
      )
    }

    const facebookCreds = credentials as FacebookCredentials

    // Check if token is expired
    if (facebookCreds.expiresAt && new Date(facebookCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { 
          error: 'Access token expired. Please reconnect.', 
          connected: false,
          expired: true
        },
        { status: 400 }
      )
    }

    // Verify by fetching page info
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET
    if (!appSecret) {
      throw new Error('Facebook app secret not configured')
    }

    const appSecretProof = generateAppSecretProof(facebookCreds.accessToken, appSecret)
    const pageInfo = await getPageInfo(
      facebookCreds.pageId!,
      facebookCreds.accessToken,
      appSecretProof
    )

    return NextResponse.json({
      connected: true,
      pageName: pageInfo.name,
      pageId: pageInfo.id,
      category: pageInfo.category,
      fanCount: pageInfo.fan_count,
    })
  } catch (error) {
    console.error('Facebook verify error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify Facebook credentials',
        connected: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
