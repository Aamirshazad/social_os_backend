/**
 * USER SERVICE
 * Business logic for user operations
 * Handles validation, authorization, and coordination
 */

import { UserRepository } from '@/core/database/repositories/UserRepository'
import { UserDTO, CreateUserDTO, UpdateUserDTO, RequestContext, UserPublicDTO } from '@/core/types/DTOs'
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '@/core/errors/AppError'
import { UpdateUserSchema, UpdateUserRoleSchema } from '@/lib/validation/schemas'

export class UserService {
  private userRepository: UserRepository

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository()
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserDTO> {
    try {
      const user = await this.userRepository.findById(userId)

      if (!user) {
        throw new NotFoundError('User')
      }

      return user
    } catch (error) {
      throw error
    }
  }

  /**
   * Get user's own profile
   */
  async getMyProfile(context: RequestContext): Promise<UserDTO> {
    return this.getUserProfile(context.userId)
  }

  /**
   * Update user profile
   */
  async updateProfile(context: RequestContext, data: UpdateUserDTO): Promise<UserDTO> {
    try {
      // Validate input
      const validatedData = UpdateUserSchema.parse(data)

      // Update user
      const updated = await this.userRepository.update(context.userId, validatedData)

      if (!updated) {
        throw new NotFoundError('User')
      }

      return updated
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if email exists in workspace
   */
  async emailExistsInWorkspace(email: string, workspaceId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmailAndWorkspace(email, workspaceId)
      return user !== null
    } catch (error) {
      throw error
    }
  }

  /**
   * Get users by role in workspace
   */
  async getUsersByRole(
    context: RequestContext,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<UserPublicDTO[]> {
    try {
      const users = await this.userRepository.findByRole(context.workspaceId, role)

      return users.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role
      }))
    } catch (error) {
      throw error
    }
  }

  /**
   * Count users in workspace
   */
  async countWorkspaceUsers(workspaceId: string): Promise<number> {
    try {
      return await this.userRepository.count({
        workspace_id: workspaceId,
        is_active: true
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all workspace users (paginated)
   */
  async getWorkspaceUsers(
    context: RequestContext,
    page: number = 1,
    pageSize: number = 20
  ): Promise<any> {
    try {
      const offset = (page - 1) * pageSize

      const result = await this.userRepository.paginate(
        {
          workspace_id: context.workspaceId,
          is_active: true
        },
        { limit: pageSize, offset }
      )

      return {
        data: result.data.map((user) => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar_url: user.avatar_url,
          last_login_at: user.last_login_at
        })),
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
          hasMore: result.hasMore
        }
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update user's last login
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userRepository.updateLastLogin(userId)
    } catch (error) {
      throw error
    }
  }

  /**
   * Search users in workspace
   */
  async searchUsers(context: RequestContext, query: string, limit: number = 10): Promise<UserPublicDTO[]> {
    try {
      // Get all users in workspace
      const users = await this.userRepository.findAllByWorkspace(context.workspaceId, { limit: 100 })

      // Filter by query (email or full_name)
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          (user.full_name && user.full_name.toLowerCase().includes(query.toLowerCase()))
      )

      // Return limited results
      return filtered.slice(0, limit).map((user) => ({
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role
      }))
    } catch (error) {
      throw error
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(context: RequestContext, userId: string): Promise<void> {
    try {
      // Only admins can deactivate other users
      if (userId !== context.userId && context.userRole !== 'admin') {
        throw new ForbiddenError('Cannot deactivate other users')
      }

      // Prevent deactivating last admin
      if (context.userRole === 'admin') {
        const admins = await this.userRepository.findByRole(context.workspaceId, 'admin')
        if (admins.length === 1 && admins[0].id === userId) {
          throw new ValidationError('Cannot deactivate the last admin')
        }
      }

      const success = await this.userRepository.delete(userId)

      if (!success) {
        throw new NotFoundError('User')
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get user by email in workspace
   */
  async getUserByEmailInWorkspace(email: string, workspaceId: string): Promise<UserDTO | null> {
    try {
      return await this.userRepository.findByEmailAndWorkspace(email, workspaceId)
    } catch (error) {
      throw error
    }
  }
}
