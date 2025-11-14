/**
 * API Route: /api/workspace/members/[userId]
 * Methods: DELETE
 *
 * DELETE: Remove a member from the workspace (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { WorkspaceService } from '@/services/database/workspaceService'

/**
 * DELETE /api/workspace/members/[userId]
 * Remove a member from the workspace
 * Requires: Admin role
 *
 * Params: userId - User ID to remove
 * Response: { success: true } or { error: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params for Next.js 15+ compatibility
    const { userId } = await params

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's role and workspace
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !('workspace_id' in userData)) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    if ((userData as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Only workspace admins can remove members' },
        { status: 403 }
      )
    }

    // Prevent removing yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the workspace' },
        { status: 400 }
      )
    }

    // Validate userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // Remove the member
    const success = await WorkspaceService.removeMember(
      (userData as any).workspace_id,
      userId,
      user.id
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/workspace/members/[userId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
