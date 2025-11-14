/**
 * API Route: /api/workspace/invites/[token]
 * Methods: GET
 *
 * GET: Validate an invite token and get invite details (public endpoint)
 */

import { NextRequest, NextResponse } from 'next/server'
import { InviteService } from '@/services/database/inviteService'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/workspace/invites/[token]
 * Validate an invite token and get invite details
 * This is a PUBLIC endpoint - no authentication required
 * Safe because it only returns info already in the token
 *
 * Params: token - Invite token to validate
 * Response: { data: { workspace_id, role, email, expires_at } } or { error: string }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Await params for Next.js 15+ compatibility
    const { token } = await params

    // Validate the token
    const invite = await InviteService.validateInvite(token)

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Get workspace name
    const supabase = await createServerClient()
    const { data: workspaceData } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', invite.workspace_id)
      .single()

    // Return invite details (without sensitive info like invited_by, used_by)
    // Only return information needed for the frontend
    return NextResponse.json({
      workspace_id: invite.workspace_id,
      workspace_name: (workspaceData as any)?.name || 'Workspace',
      role: invite.role,
      email: invite.email,
      expires_at: invite.expires_at,
      is_expired: InviteService.isInviteExpired(invite.expires_at),
      time_remaining: InviteService.getTimeRemaining(invite.expires_at),
    })
  } catch (error) {
    console.error('Error in GET /api/workspace/invites/[token]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
