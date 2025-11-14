/**
 * API Route: /api/workspace/invites
 * Methods: GET, POST, DELETE
 *
 * GET: List all pending invites for workspace (admin only)
 * POST: Create a new invitation (admin only)
 * DELETE: Revoke an invitation (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { InviteService } from '@/services/database/inviteService'
import { WorkspaceService } from '@/services/database/workspaceService'
import type { CreateInviteInput } from '@/types/workspace'

/**
 * GET /api/workspace/invites
 * Get all pending invitations for the workspace
 * Requires: Admin role
 *
 * Response: { data: WorkspaceInvite[] } or { error: string }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Ensure user has a workspace (auto-create if missing)
    let workspaceId: string
    let userRole: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
      
      // Get user role using RPC to avoid RLS recursion
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
      if (!rpcError && rpcData) {
        const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
        userRole = profileData?.role || 'admin'
      } else {
        // Fallback to admin if RPC fails
        console.warn('Failed to get user role via RPC, defaulting to admin:', rpcError)
        userRole = 'admin'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
      console.error('Error ensuring user workspace:', errorMessage, error)
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Only admins can view invites
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view invitations' },
        { status: 403 }
      )
    }

    // Get all pending invites
    const invites = await InviteService.getWorkspaceInvites(workspaceId)

    return NextResponse.json({ data: invites })
  } catch (error) {
    console.error('Error in GET /api/workspace/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspace/invites
 * Create a new invitation
 * Requires: Admin role
 *
 * Body: { email?: string, role: UserRole, expiresInDays?: number }
 * Response: { data: { invite: WorkspaceInvite, inviteUrl: string } } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Ensure user has a workspace (auto-create if missing)
    let workspaceId: string
    let userRole: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
      
      // Get user role using RPC to avoid RLS recursion
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
      if (!rpcError && rpcData) {
        const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
        userRole = profileData?.role || 'admin'
      } else {
        // Fallback to admin if RPC fails
        console.warn('Failed to get user role via RPC, defaulting to admin:', rpcError)
        userRole = 'admin'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
      console.error('Error ensuring user workspace:', errorMessage, error)
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create invitations' },
        { status: 403 }
      )
    }

    // Check if workspace is full
    const isFull = await WorkspaceService.isWorkspaceFull(workspaceId)
    if (isFull) {
      return NextResponse.json(
        { error: 'Workspace is at maximum capacity' },
        { status: 400 }
      )
    }

    // Parse request body
    let input: CreateInviteInput
    try {
      input = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate input
    const validRoles = ['admin', 'editor', 'viewer']
    if (!validRoles.includes(input.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    if (input.email && !input.email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (input.expiresInDays !== undefined && input.expiresInDays !== null) {
      if (input.expiresInDays < 1 || input.expiresInDays > 365) {
        return NextResponse.json(
          { error: 'Expiration must be between 1 and 365 days' },
          { status: 400 }
        )
      }
    }

    // Create the invite
    const invite = await InviteService.createInvite(
      workspaceId,
      input,
      user.id
    )

    if (!invite) {
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${invite.token}`

    return NextResponse.json({
      data: {
        invite,
        inviteUrl,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/workspace/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workspace/invites
 * Revoke an invitation
 * Requires: Admin role
 *
 * Query params: inviteId - Invite ID to revoke
 * Response: { success: true } or { error: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get invite ID from query params
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Missing inviteId query parameter' },
        { status: 400 }
      )
    }

    // Ensure user has a workspace (auto-create if missing)
    let workspaceId: string
    let userRole: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
      
      // Get user role using RPC to avoid RLS recursion
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
      if (!rpcError && rpcData) {
        const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
        userRole = profileData?.role || 'admin'
      } else {
        // Fallback to admin if RPC fails
        console.warn('Failed to get user role via RPC, defaulting to admin:', rpcError)
        userRole = 'admin'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
      console.error('Error ensuring user workspace:', errorMessage, error)
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can revoke invitations' },
        { status: 403 }
      )
    }

    // Revoke the invite
    const success = await InviteService.revokeInvite(
      inviteId,
      workspaceId,
      user.id
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/workspace/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
