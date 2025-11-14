/**
 * API Route: /api/workspace/members/[userId]/role
 * Methods: PATCH
 *
 * PATCH: Change a member's role (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { WorkspaceService } from '@/services/database/workspaceService'
import type { UserRole } from '@/types/workspace'

/**
 * PATCH /api/workspace/members/[userId]/role
 * Change a member's role
 * Requires: Admin role
 *
 * Params: userId - User ID to change role for
 * Body: { role: 'admin' | 'editor' | 'viewer' }
 * Response: { success: true } or { error: string }
 */
export async function PATCH(
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
        { error: 'Only workspace admins can change member roles' },
        { status: 403 }
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

    const newRole = body.role as UserRole

    // Validate role
    const validRoles: UserRole[] = ['admin', 'editor', 'viewer']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, editor, or viewer' },
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

    // Change the role
    const success = await WorkspaceService.changeMemberRole(
      (userData as any).workspace_id,
      userId,
      newRole,
      user.id
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to change member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/workspace/members/[userId]/role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
