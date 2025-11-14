/**
 * LinkedIn - Verify Credentials
 * POST /api/linkedin/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getLinkedInProfile } from '@/lib/linkedin/client'
import { CredentialService } from '@/services/database'
import type { LinkedInCredentials } from '@/types'

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

    // Get LinkedIn credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'linkedin',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials)) {
      return NextResponse.json(
        { error: 'LinkedIn not connected', connected: false },
        { status: 400 }
      )
    }

    const linkedInCreds = credentials as LinkedInCredentials

    // Check if token is expired
    if (linkedInCreds.expiresAt && new Date(linkedInCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { 
          error: 'Access token expired. Please reconnect.', 
          connected: false,
          expired: true
        },
        { status: 400 }
      )
    }

    // Verify by fetching current user profile
    const profile = await getLinkedInProfile(linkedInCreds.accessToken)

    return NextResponse.json({
      connected: true,
      profileName: profile.name,
      profileId: linkedInCreds.profileId,
      email: profile.email,
    })
  } catch (error) {
    console.error('LinkedIn verify error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify LinkedIn credentials',
        connected: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
