/**
 * API Route: /api/workspace/activity
 * Methods: GET
 *
 * GET: Get activity/audit log for the workspace with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspaceActivityLog } from '@/services/database/auditLogService'

/**
 * GET /api/workspace/activity
 * Get activity log for the workspace with optional filters
 * Requires: Admin role (to view activity)
 *
 * Query params (all optional):
 *   - userId: Filter by specific user
 *   - action: Filter by action type
 *   - startDate: ISO date string for start of range
 *   - endDate: ISO date string for end of range
 *   - limit: Number of results (default 50, max 500)
 *   - offset: Starting position (default 0)
 *
 * Response: { data: ActivityLogEntry[], total: number, limit: number, offset: number, hasMore: boolean }
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

    // Get user's workspace and role
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

    // Only admins can view activity logs
    if ((userData as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view activity logs' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)

    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    let limit = parseInt(searchParams.get('limit') || '50')
    let offset = parseInt(searchParams.get('offset') || '0')

    // Validate pagination parameters
    if (isNaN(limit) || limit < 1) limit = 50
    if (isNaN(offset) || offset < 0) offset = 0
    if (limit > 500) limit = 500 // Cap at 500

    // Validate date range
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate format' },
        { status: 400 }
      )
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endDate format' },
        { status: 400 }
      )
    }

    // Get activity log
    const result = await getWorkspaceActivityLog((userData as any).workspace_id, {
      userId,
      action: action as any,
      startDate,
      endDate,
      limit,
      offset,
    })

    // Format activities for response
    const activities = result.data.map((log: any) => ({
      id: log.id,
      workspace_id: log.workspace_id,
      user_id: log.user_id,
      user_email: log.users?.email || 'Unknown User',
      user_name: log.users?.full_name || null,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details,
      created_at: log.created_at,
    }))

    return NextResponse.json({
      data: activities,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    })
  } catch (error) {
    console.error('Error in GET /api/workspace/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
