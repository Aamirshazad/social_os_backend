/**
 * WORKSPACE REPOSITORY
 * Handles all workspace database operations
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Repository, Pagination, PaginatedResult, CursorPaginatedResult, FindOptions } from '../Repository'
import { WorkspaceDTO, CreateWorkspaceDTO, UpdateWorkspaceDTO } from '../../types/DTOs'
import { Database } from '@/lib/supabase/types'
import { DatabaseError } from '../../errors/AppError'

export class WorkspaceRepository extends Repository<WorkspaceDTO, CreateWorkspaceDTO, UpdateWorkspaceDTO> {
  protected tableName = 'workspaces'

  private async getSupabase() {
    const cookieStore = await cookies()
    return createServerClient<Database>(
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
              // Handle cookie errors
            }
          }
        }
      }
    )
  }

  /**
   * Find all active workspaces
   */
  async findAll(options?: FindOptions): Promise<WorkspaceDTO[]> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase
        .from('workspaces')
        .select('*')
        .eq('is_active', true)

      if (options?.orderBy) {
        options.orderBy.forEach((order) => {
          query = query.order(order.field, { ascending: order.direction === 'asc' })
        })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      throw new DatabaseError('Failed to fetch workspaces', { error: String(error) })
    }
  }

  /**
   * Find workspace by ID
   */
  async findById(workspaceId: string): Promise<WorkspaceDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to fetch workspace', { error: String(error) })
    }
  }

  /**
   * Find workspaces by criteria
   */
  async find(where: Record<string, any>, options?: FindOptions): Promise<WorkspaceDTO[]> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('workspaces').select('*')

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })

      if (options?.orderBy) {
        options.orderBy.forEach((order) => {
          query = query.order(order.field, { ascending: order.direction === 'asc' })
        })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      throw new DatabaseError('Failed to find workspaces', { error: String(error) })
    }
  }

  /**
   * Find first workspace matching criteria
   */
  async findFirst(where: Record<string, any>): Promise<WorkspaceDTO | null> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('workspaces').select('*')

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })

      const { data, error } = await query.limit(1).single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('Failed to find workspace', { error: String(error) })
    }
  }

  /**
   * Count workspaces
   */
  async count(where?: Record<string, any>): Promise<number> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('workspaces').select('id', { count: 'exact', head: true })

      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else {
            query = query.eq(key, value)
          }
        })
      }

      const { count, error } = await query

      if (error) throw error
      return count || 0
    } catch (error) {
      throw new DatabaseError('Failed to count workspaces', { error: String(error) })
    }
  }

  /**
   * Create new workspace
   */
  async create(data: CreateWorkspaceDTO): Promise<WorkspaceDTO> {
    try {
      const supabase = await this.getSupabase()

      const { data: result, error } = await ((supabase
        .from('workspaces') as any)
        .insert([
          {
            name: data.name,
            description: data.description || null,
            logo_url: data.logo_url || null,
            max_users: data.max_users || 10,
            settings: {},
            is_active: true
          }
        ])
        .select()
        .single())

      if (error) throw error
      if (!result) throw new Error('Failed to create workspace')

      return result as WorkspaceDTO
    } catch (error) {
      throw new DatabaseError('Failed to create workspace', { error: String(error) })
    }
  }

  /**
   * Update workspace
   */
  async update(workspaceId: string, data: UpdateWorkspaceDTO): Promise<WorkspaceDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.logo_url !== undefined) updateData.logo_url = data.logo_url
      if (data.max_users !== undefined) updateData.max_users = data.max_users
      if (data.is_active !== undefined) updateData.is_active = data.is_active

      const { data: result, error } = await ((supabase
        .from('workspaces') as any)
        .update(updateData)
        .eq('id', workspaceId)
        .select()
        .single())

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return result || null
    } catch (error) {
      throw new DatabaseError('Failed to update workspace', { error: String(error) })
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  async delete(workspaceId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await ((supabase
        .from('workspaces') as any)
        .update({ is_active: false })
        .eq('id', workspaceId))

      if (error) throw error
      return true
    } catch (error) {
      throw new DatabaseError('Failed to delete workspace', { error: String(error) })
    }
  }

  /**
   * Delete multiple workspaces
   */
  async deleteMany(where: Record<string, any>): Promise<number> {
    try {
      const supabase = await this.getSupabase()

      let query = (supabase.from('workspaces') as any).update({ is_active: false })

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })

      const { count, error } = await query.select('id')

      if (error) throw error
      return count || 0
    } catch (error) {
      throw new DatabaseError('Failed to delete workspaces', { error: String(error) })
    }
  }

  /**
   * Check if workspace exists
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    try {
      const workspace = await this.findFirst(where)
      return workspace !== null
    } catch (error) {
      throw new DatabaseError('Failed to check workspace existence', { error: String(error) })
    }
  }

  /**
   * Get paginated results
   */
  async paginate(
    where: Record<string, any>,
    options: { limit: number; offset: number }
  ): Promise<PaginatedResult<WorkspaceDTO>> {
    try {
      const totalCount = await this.count(where)

      const results = await this.find(where, {
        limit: options.limit,
        offset: options.offset,
        orderBy: [{ field: 'created_at', direction: 'desc' }]
      })

      const page = Math.floor(options.offset / options.limit) + 1

      return {
        data: results,
        total: totalCount,
        page,
        pageSize: options.limit,
        hasMore: options.offset + options.limit < totalCount
      }
    } catch (error) {
      throw new DatabaseError('Failed to paginate workspaces', { error: String(error) })
    }
  }

  /**
   * Get cursor-paginated results
   */
  async cursorPaginate(
    where: Record<string, any>,
    options: { limit: number; cursor?: string }
  ): Promise<CursorPaginatedResult<WorkspaceDTO>> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('workspaces').select('*')

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })

      if (options.cursor) {
        query = query.gt('created_at', options.cursor)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(options.limit + 1)

      if (error) throw error

      const items = (data || []) as WorkspaceDTO[]
      const hasMore = items.length > options.limit
      const results = hasMore ? items.slice(0, -1) : items

      return {
        data: results,
        nextCursor: results.length > 0 ? results[results.length - 1].created_at : undefined,
        hasMore
      }
    } catch (error) {
      throw new DatabaseError('Failed to cursor paginate workspaces', { error: String(error) })
    }
  }

  /**
   * Upsert workspace
   */
  async upsert(
    where: Record<string, any>,
    createData: CreateWorkspaceDTO,
    updateData: UpdateWorkspaceDTO
  ): Promise<WorkspaceDTO> {
    try {
      const existing = await this.findFirst(where)

      if (existing) {
        const updated = await this.update(existing.id, updateData)
        if (!updated) throw new Error('Failed to update existing workspace')
        return updated
      }

      return await this.create(createData)
    } catch (error) {
      throw new DatabaseError('Failed to upsert workspace', { error: String(error) })
    }
  }

  /**
   * Find workspace by name
   */
  async findByName(name: string): Promise<WorkspaceDTO | null> {
    return this.findFirst({ name, is_active: true })
  }

  /**
   * Update workspace settings
   */
  async updateSettings(workspaceId: string, settings: Record<string, any>): Promise<WorkspaceDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await ((supabase
        .from('workspaces') as any)
        .update({ settings })
        .eq('id', workspaceId)
        .select()
        .single())

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to update workspace settings', { error: String(error) })
    }
  }
}
