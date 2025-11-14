/**
 * API Route: /api/workspace/members
 * Methods: GET
 *
 * GET: List all members in the workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { WorkspaceService } from '@/services/database/workspaceService'

/**
 * GET /api/workspace/members
 * Get all members in the user's workspace
 *
 * Query params (optional):
 *   - role: Filter by role (admin, editor, viewer)
 *
 * Response: { data: WorkspaceMember[] } or { error: string }
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
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
      console.error('Error ensuring user workspace:', errorMessage, error)
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Get all members
    let members = await WorkspaceService.getWorkspaceMembers(workspaceId)

    // Optional: Filter by role if provided
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')

    if (roleFilter) {
      const validRoles = ['admin', 'editor', 'viewer']
      if (!validRoles.includes(roleFilter)) {
        return NextResponse.json(
          { error: 'Invalid role filter' },
          { status: 400 }
        )
      }
      members = members.filter(m => m.role === roleFilter)
    }

    return NextResponse.json({ data: members })
  } catch (error) {
    console.error('Error in GET /api/workspace/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
