/**
 * Audit Log Service
 * Logs all credential-related events for compliance and debugging
 */

import { createServerClient } from '@/lib/supabase/server'
import type { Platform } from '@/types'

// Cache the Supabase client
let supabaseInstance: any = null

async function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = await createServerClient()
  }
  return supabaseInstance
}

export interface AuditEventParams {
  workspaceId: string
  userId: string
  platform: Platform
  action: string
  status: 'success' | 'failed' | 'partial'
  errorMessage?: string
  errorCode?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  metadata?: any
}

/**
 * Log an audit event
 */
export async function logAuditEvent({
  workspaceId,
  userId,
  platform,
  action,
  status,
  errorMessage,
  errorCode,
  ipAddress,
  userAgent,
  requestPath,
  metadata,
}: AuditEventParams): Promise<void> {
  try {
    const supabase = await getSupabase()
    
    // Build insert object, only include request_path if it's provided
    const insertData: any = {
      workspace_id: workspaceId,
      user_id: userId,
      platform,
      action,
      status,
      error_message: errorMessage || null,
      error_code: errorCode || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata: metadata || null,
    }
    
    // Only add request_path if provided (to avoid schema cache issues)
    if (requestPath !== undefined) {
      insertData.request_path = requestPath
    }
    
    const { error } = await (supabase.from('credential_audit_log') as any).insert(insertData)

    if (error) {
      // Only log non-RLS errors to reduce noise
      if (error.code !== '42501') {
        console.error(`Failed to insert audit log for ${platform}/${action}:`, error)
      } else {
        console.debug(`Audit log RLS policy blocked insert for ${platform}/${action}`)
      }
    }
  } catch (error) {
    console.debug('Audit logging error (non-blocking):', error)
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Get audit logs for a workspace
 */
export async function getAuditLogs(
  workspaceId: string,
  filters?: {
    platform?: Platform
    action?: string
    status?: string
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  }
): Promise<any[]> {
  try {
    const supabase = await getSupabase()
    let query = (supabase
      .from('credential_audit_log') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (filters?.platform) {
      query = query.eq('platform', filters.platform)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    const limit = Math.min(filters?.limit || 100, 1000) // Cap at 1000
    const offset = filters?.offset || 0

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  workspaceId: string,
  userId: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<any[]> {
  try {
    const supabase = await getSupabase()
    let query = (supabase
      .from('credential_audit_log') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const limit = Math.min(options?.limit || 50, 500)
    const offset = options?.offset || 0

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user audit logs:', error)
    return []
  }
}

/**
 * Get summary of credential activities
 */
export async function getAuditSummary(
  workspaceId: string,
  days: number = 7
): Promise<{
  totalConnections: number
  totalDisconnections: number
  totalRefreshes: number
  totalFailures: number
  platformStats: Record<string, any>
  recentActivity: any[]
}> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const logs = await getAuditLogs(workspaceId, {
      startDate,
      limit: 1000,
    })

    const summary = {
      totalConnections: 0,
      totalDisconnections: 0,
      totalRefreshes: 0,
      totalFailures: 0,
      platformStats: {
        twitter: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
        linkedin: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
        facebook: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
        instagram: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
      },
      recentActivity: logs.slice(0, 10),
    }

    for (const log of logs) {
      if (log.status === 'failed') {
        summary.totalFailures++
        ;(summary.platformStats as any)[(log as any).platform].failures++
      }

      if (log.action === 'platform_connected') {
        summary.totalConnections++
        ;(summary.platformStats as any)[(log as any).platform].connections++
      } else if (log.action === 'platform_disconnected') {
        summary.totalDisconnections++
        ;(summary.platformStats as any)[(log as any).platform].disconnections++
      } else if (log.action === 'token_refreshed') {
        summary.totalRefreshes++
        ;(summary.platformStats as any)[(log as any).platform].refreshes++
      }
    }

    return summary
  } catch (error) {
    console.error('Error getting audit summary:', error)
    return {
      totalConnections: 0,
      totalDisconnections: 0,
      totalRefreshes: 0,
      totalFailures: 0,
      platformStats: {
        twitter: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
        linkedin: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
        facebook: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
        instagram: { connections: 0, disconnections: 0, refreshes: 0, failures: 0 },
      },
      recentActivity: [],
    }
  }
}

/**
 * Clean up old audit logs (older than 90 days)
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  try {
    const supabase = await getSupabase()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data, error } = await (supabase
      .from('credential_audit_log') as any)
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString())
      .select('id')

    if (error) throw error

    return data?.length || 0
  } catch (error) {
    console.error('Error cleaning up audit logs:', error)
    return 0
  }
}

// ============================================
// WORKSPACE-SPECIFIC AUDIT LOGGING
// ============================================

export type WorkspaceAuditAction =
  | 'member_invited'        // When someone sends an invite
  | 'member_joined'         // When someone accepts invite
  | 'member_removed'        // When admin removes a member
  | 'member_role_changed'   // When admin changes member's role
  | 'workspace_updated'     // When workspace settings change
  | 'invite_revoked'        // When admin cancels an invite

export interface WorkspaceAuditLogParams {
  workspaceId: string
  userId: string
  action: WorkspaceAuditAction
  entityType: string
  entityId: string
  details: Record<string, any>
}

/**
 * Log workspace-related actions for audit trail
 * Used for: member invitations, role changes, removals, etc.
 *
 * @param params - Audit log parameters
 * @throws Errors are logged but not thrown to prevent breaking operations
 */
export async function logWorkspaceAction({
  workspaceId,
  userId,
  action,
  entityType,
  entityId,
  details,
}: WorkspaceAuditLogParams): Promise<void> {
  try {
    const supabase = await getSupabase()
    const { error } = await (supabase.from('audit_logs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error(`Failed to log workspace action "${action}":`, error)
    }
  } catch (error) {
    console.error('Workspace audit logging error:', error)
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Get workspace activity log with filters
 *
 * @param workspaceId - Workspace to get activity for
 * @param filters - Optional filters for activity type, user, date range
 * @returns Paginated activity logs with total count
 */
export async function getWorkspaceActivityLog(
  workspaceId: string,
  filters?: {
    userId?: string
    action?: WorkspaceAuditAction
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }
): Promise<{
  data: any[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}> {
  try {
    // Build the query
    const supabase = await getSupabase()
    let query = (supabase
      .from('audit_logs') as any)
      .select(
        `
        id,
        workspace_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at,
        users:user_id (
          email,
          full_name
        )
      `,
        { count: 'exact' }
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    // Pagination
    const limit = Math.min(filters?.limit || 50, 500) // Cap at 500
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching workspace activity log:', error)
      throw error
    }

    return {
      data: data || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    }
  } catch (error) {
    console.error('Error getting workspace activity log:', error)
    return {
      data: [],
      total: 0,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
      hasMore: false,
    }
  }
}
