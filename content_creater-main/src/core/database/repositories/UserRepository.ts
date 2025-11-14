/**
 * USER REPOSITORY
 * Handles all user database operations
 * Implementation of the Repository pattern
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Repository, Pagination, PaginatedResult, CursorPaginatedResult, FindOptions } from '../Repository'
import { UserDTO, CreateUserDTO, UpdateUserDTO } from '../../types/DTOs'
import { Database } from '@/lib/supabase/types'
import { DatabaseError, NotFoundError } from '../../errors/AppError'

export class UserRepository extends Repository<UserDTO, CreateUserDTO, UpdateUserDTO> {
  protected tableName = 'users'

  constructor() {
    super()
    // Initialize in constructor - will be called from each method
  }

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
   * Find all users (base repository method - not typically used)
   */
  async findAll(options?: FindOptions): Promise<UserDTO[]> {
    throw new Error('Use findAllByWorkspace instead for workspace-specific queries')
  }

  /**
   * Find all users in a workspace
   */
  async findAllByWorkspace(workspaceId: string, options?: FindOptions): Promise<UserDTO[]> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase
        .from('users')
        .select('*')
        .eq('workspace_id', workspaceId)
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
      throw new DatabaseError('Failed to fetch users', { error: String(error) })
    }
  }

  /**
   * Find a user by ID
   */
  async findById(userId: string): Promise<UserDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to fetch user', { error: String(error) })
    }
  }

  /**
   * Find users by custom criteria
   */
  async find(where: Record<string, any>, options?: FindOptions): Promise<UserDTO[]> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('users').select('*')

      // Apply WHERE conditions
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
      throw new DatabaseError('Failed to find users', { error: String(error) })
    }
  }

  /**
   * Find first user matching criteria
   */
  async findFirst(where: Record<string, any>): Promise<UserDTO | null> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('users').select('*')

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
      throw new DatabaseError('Failed to find user', { error: String(error) })
    }
  }

  /**
   * Count users matching criteria
   */
  async count(where?: Record<string, any>): Promise<number> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('users').select('id', { count: 'exact', head: true })

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
      throw new DatabaseError('Failed to count users', { error: String(error) })
    }
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDTO): Promise<UserDTO> {
    try {
      const supabase = await this.getSupabase()

      const { data: result, error } = await (supabase as any)
        .from('users')
        .insert([
          {
            email: data.email,
            full_name: data.full_name || null,
            role: data.role || 'viewer',
            avatar_url: data.avatar_url || null,
            phone: data.phone || null,
            is_active: true
          }
        ])
        .select()
        .single()

      if (error) throw error
      if (!result) throw new Error('Failed to create user')

      return result as UserDTO
    } catch (error) {
      throw new DatabaseError('Failed to create user', { error: String(error) })
    }
  }

  /**
   * Update a user by ID
   */
  async update(userId: string, data: UpdateUserDTO): Promise<UserDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const updateData: any = {}
      if (data.full_name !== undefined) updateData.full_name = data.full_name
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.is_active !== undefined) updateData.is_active = data.is_active

      const { data: result, error } = await (supabase as any)
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return result || null
    } catch (error) {
      throw new DatabaseError('Failed to update user', { error: String(error) })
    }
  }

  /**
   * Delete a user by ID (soft delete)
   */
  async delete(userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await (supabase as any)
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)

      if (error) throw error
      return true
    } catch (error) {
      throw new DatabaseError('Failed to delete user', { error: String(error) })
    }
  }

  /**
   * Delete multiple users
   */
  async deleteMany(where: Record<string, any>): Promise<number> {
    try {
      const supabase = await this.getSupabase()

      let query = (supabase as any).from('users').update({ is_active: false })

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
      throw new DatabaseError('Failed to delete users', { error: String(error) })
    }
  }

  /**
   * Check if user exists
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    try {
      const user = await this.findFirst(where)
      return user !== null
    } catch (error) {
      throw new DatabaseError('Failed to check user existence', { error: String(error) })
    }
  }

  /**
   * Get paginated results
   */
  async paginate(
    where: Record<string, any>,
    options: { limit: number; offset: number }
  ): Promise<PaginatedResult<UserDTO>> {
    try {
      const supabase = await this.getSupabase()

      // Get total count
      const totalCount = await this.count(where)

      // Get paginated data
      let query = supabase.from('users').select('*')

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(options.offset, options.offset + options.limit - 1)

      if (error) throw error

      const page = Math.floor(options.offset / options.limit) + 1

      return {
        data: data || [],
        total: totalCount,
        page,
        pageSize: options.limit,
        hasMore: options.offset + options.limit < totalCount
      }
    } catch (error) {
      throw new DatabaseError('Failed to paginate users', { error: String(error) })
    }
  }

  /**
   * Get cursor-paginated results
   */
  async cursorPaginate(
    where: Record<string, any>,
    options: { limit: number; cursor?: string }
  ): Promise<CursorPaginatedResult<UserDTO>> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase.from('users').select('*')

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })

      // If cursor provided, fetch from cursor onwards
      if (options.cursor) {
        query = query.gt('created_at', options.cursor)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(options.limit + 1) // Fetch one extra to determine hasMore

      if (error) throw error

      const items = data || []
      const hasMore = items.length > options.limit
      const results = hasMore ? items.slice(0, -1) : items

      return {
        data: results as UserDTO[],
        nextCursor: results.length > 0 ? (results[results.length - 1] as any).created_at : undefined,
        hasMore
      }
    } catch (error) {
      throw new DatabaseError('Failed to cursor paginate users', { error: String(error) })
    }
  }

  /**
   * Upsert - update if exists, create if not
   */
  async upsert(
    where: Record<string, any>,
    createData: CreateUserDTO,
    updateData: UpdateUserDTO
  ): Promise<UserDTO> {
    try {
      const existing = await this.findFirst(where)

      if (existing) {
        const updated = await this.update(existing.id, updateData)
        if (!updated) throw new Error('Failed to update existing user')
        return updated
      }

      return await this.create(createData)
    } catch (error) {
      throw new DatabaseError('Failed to upsert user', { error: String(error) })
    }
  }

  /**
   * Find by email and workspace
   */
  async findByEmailAndWorkspace(email: string, workspaceId: string): Promise<UserDTO | null> {
    return this.findFirst({ email, workspace_id: workspaceId })
  }

  /**
   * Get users by role in workspace
   */
  async findByRole(workspaceId: string, role: string): Promise<UserDTO[]> {
    return this.find({ workspace_id: workspaceId, role })
  }

  /**
   * Update user role
   */
  async updateRole(userId: string, role: string): Promise<UserDTO | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await (supabase as any)
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select()
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      throw new DatabaseError('Failed to update user role', { error: String(error) })
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await (supabase as any)
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to update last login', { error: String(error) })
    }
  }
}
