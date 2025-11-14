/**
 * API Route: /api/workspace/invites/accept
 * Methods: POST
 *
 * POST: Accept an invitation and join workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { InviteService } from '@/services/database/inviteService'

/**
 * POST /api/workspace/invites/accept
 * Accept an invitation and join the workspace
 * Requires: User must be logged in
 *
 * Body: { token: string }
 * Response: { success: true } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to accept an invite' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid token' },
        { status: 400 }
      )
    }

    // Accept the invite
    const success = await InviteService.acceptInvite(token, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/workspace/invites/accept:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
