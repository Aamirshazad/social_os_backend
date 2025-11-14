/**
 * AUTHENTICATION MIDDLEWARE
 * Handles JWT verification, user context extraction, and workspace isolation
 */

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { UnauthorizedError, ForbiddenError } from '../errors/AppError'
import { RequestContext } from '../types/DTOs'
import { Database } from '@/lib/supabase/types'

/**
 * Get authenticated user from request
 */
export async function getAuthUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Handle cookie setting errors silently
          }
        }
      }
    }
  )

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('Session expired or invalid')
  }

  return user
}

/**
 * Get user's workspace info and role
 */
export async function getUserWorkspace(userId: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Handle cookie setting errors silently
          }
        }
      }
    }
  )

  const { data: user, error } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      full_name,
      role,
      avatar_url,
      phone,
      is_active,
      last_login_at,
      workspace_id,
      created_at,
      updated_at,
      workspaces (
        id,
        name,
        description,
        logo_url,
        max_users,
        is_active,
        created_at,
        updated_at
      )
    `
    )
    .eq('id', userId)
    .single()

  if (error || !user) {
    throw new UnauthorizedError('User not found')
  }

  const userData = user as any
  const workspaceData = userData.workspaces
  if (!workspaceData) {
    throw new UnauthorizedError('User workspace not found')
  }

  return {
    user: {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      avatar_url: userData.avatar_url,
      phone: userData.phone,
      is_active: userData.is_active,
      workspace_id: userData.workspace_id as string,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    },
    workspace: {
      id: workspaceData.id,
      name: workspaceData.name,
      description: workspaceData.description,
      logo_url: workspaceData.logo_url,
      max_users: workspaceData.max_users,
      is_active: workspaceData.is_active,
      created_at: workspaceData.created_at,
      updated_at: workspaceData.updated_at
    }
  }
}

/**
 * Create request context with auth info
 */
export async function createRequestContext(
  requestId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<RequestContext> {
  const authUser = await getAuthUser()
  const { user, workspace } = await getUserWorkspace(authUser.id)

  if (!user.is_active) {
    throw new ForbiddenError('User account is inactive')
  }

  if (!workspace.is_active) {
    throw new ForbiddenError('Workspace is inactive')
  }

  return {
    userId: user.id,
    userEmail: user.email,
    workspaceId: workspace.id,
    userRole: user.role as 'admin' | 'editor' | 'viewer',
    user: {
      id: user.id,
      workspace_id: workspace.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
      phone: user.phone,
      is_active: user.is_active,
      last_login_at: null,
      created_at: user.created_at,
      updated_at: user.updated_at
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      logo_url: workspace.logo_url,
      max_users: workspace.max_users,
      is_active: workspace.is_active,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at
    },
    requestId,
    timestamp: new Date(),
    ipAddress,
    userAgent
  }
}

/**
 * Check if user has admin role
 */
export function requireAdmin(context: RequestContext): void {
  if (context.userRole !== 'admin') {
    throw new ForbiddenError('Admin role required')
  }
}

/**
 * Check if user has editor or admin role
 */
export function requireEditor(context: RequestContext): void {
  if (!['admin', 'editor'].includes(context.userRole)) {
    throw new ForbiddenError('Editor or Admin role required')
  }
}

/**
 * Check multiple permission requirements
 */
export function requireRole(context: RequestContext, ...roles: string[]): void {
  if (!roles.includes(context.userRole)) {
    throw new ForbiddenError(`One of roles required: ${roles.join(', ')}`)
  }
}

/**
 * Extract request metadata
 */
export function extractRequestMetadata(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return { ip, userAgent }
}

/**
 * Generate request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
