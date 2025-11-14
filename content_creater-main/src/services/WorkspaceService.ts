/**
 * WORKSPACE SERVICE
 * Business logic for workspace operations
 * Handles validation, authorization, and coordination
 */

import { WorkspaceRepository } from '@/core/database/repositories/WorkspaceRepository'
import { UserRepository } from '@/core/database/repositories/UserRepository'
import {
  WorkspaceDTO,
  CreateWorkspaceDTO,
  UpdateWorkspaceDTO,
  RequestContext,
  UserPublicDTO
} from '@/core/types/DTOs'
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '@/core/errors/AppError'
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@/lib/validation/schemas'

export class WorkspaceService {
  private workspaceRepository: WorkspaceRepository
  private userRepository: UserRepository

  constructor(
    workspaceRepository?: WorkspaceRepository,
    userRepository?: UserRepository
  ) {
    this.workspaceRepository = workspaceRepository || new WorkspaceRepository()
    this.userRepository = userRepository || new UserRepository()
  }

  /**
   * Get workspace details
   */
  async getWorkspace(context: RequestContext): Promise<WorkspaceDTO> {
    try {
      const workspace = await this.workspaceRepository.findById(context.workspaceId)

      if (!workspace) {
        throw new NotFoundError('Workspace')
      }

      return workspace
    } catch (error) {
      throw error
    }
  }

  /**
   * Create new workspace
   */
  async createWorkspace(data: CreateWorkspaceDTO, creatorId: string): Promise<WorkspaceDTO> {
    try {
      // Validate input
      const validatedData = CreateWorkspaceSchema.parse(data)

      // Check if workspace with same name already exists
      const existing = await this.workspaceRepository.findByName(validatedData.name)
      if (existing) {
        throw new ConflictError('Workspace with this name already exists')
      }

      // Create workspace
      const workspace = await this.workspaceRepository.create(validatedData)

      // Add creator as admin to workspace
      await this.userRepository.create({
        email: '', // Will be fetched from auth
        role: 'admin'
      })

      return workspace
    } catch (error) {
      throw error
    }
  }

  /**
   * Update workspace (admin only)
   */
  async updateWorkspace(
    context: RequestContext,
    data: UpdateWorkspaceDTO
  ): Promise<WorkspaceDTO> {
    try {
      // Only admins can update
      if (context.userRole !== 'admin') {
        throw new ForbiddenError('Only admins can update workspace')
      }

      // Validate input
      const validatedData = UpdateWorkspaceSchema.parse(data)

      // Update workspace
      const updated = await this.workspaceRepository.update(context.workspaceId, validatedData)

      if (!updated) {
        throw new NotFoundError('Workspace')
      }

      return updated
    } catch (error) {
      throw error
    }
  }

  /**
   * Delete workspace (admin only)
   */
  async deleteWorkspace(context: RequestContext): Promise<void> {
    try {
      // Only admins can delete
      if (context.userRole !== 'admin') {
        throw new ForbiddenError('Only admins can delete workspace')
      }

      const success = await this.workspaceRepository.delete(context.workspaceId)

      if (!success) {
        throw new NotFoundError('Workspace')
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get workspace members
   */
  async getMembers(context: RequestContext): Promise<any[]> {
    try {
      const users = await this.userRepository.findAllByWorkspace(context.workspaceId)

      // Return public profile only
      return users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at
      }))
    } catch (error) {
      throw error
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    context: RequestContext,
    userId: string,
    newRole: 'admin' | 'editor' | 'viewer'
  ): Promise<UserPublicDTO> {
    try {
      // Only admins can update roles
      if (context.userRole !== 'admin') {
        throw new ForbiddenError('Only admins can update member roles')
      }

      // Prevent removing last admin
      if (newRole !== 'admin') {
        const admins = await this.userRepository.findByRole(context.workspaceId, 'admin')
        if (admins.length === 1 && admins[0].id === userId) {
          throw new ValidationError('Cannot remove the last admin from workspace')
        }
      }

      // Update user role
      const updated = await this.userRepository.updateRole(userId, newRole)

      if (!updated) {
        throw new NotFoundError('User')
      }

      return {
        id: updated.id,
        full_name: updated.full_name,
        avatar_url: updated.avatar_url,
        role: updated.role
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(context: RequestContext, userId: string): Promise<void> {
    try {
      // Only admins can remove members
      if (context.userRole !== 'admin') {
        throw new ForbiddenError('Only admins can remove members')
      }

      // Prevent removing self
      if (userId === context.userId) {
        throw new ValidationError('Cannot remove yourself from workspace')
      }

      // Prevent removing last admin
      const admins = await this.userRepository.findByRole(context.workspaceId, 'admin')
      if (admins.length === 1 && admins[0].id === userId) {
        throw new ValidationError('Cannot remove the last admin from workspace')
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
   * Get workspace settings
   */
  async getSettings(context: RequestContext): Promise<Record<string, any>> {
    try {
      const workspace = await this.workspaceRepository.findById(context.workspaceId)

      if (!workspace) {
        throw new NotFoundError('Workspace')
      }

      // Settings are not stored in WorkspaceDTO, return empty object
      return {}
    } catch (error) {
      throw error
    }
  }

  /**
   * Update workspace settings
   */
  async updateSettings(
    context: RequestContext,
    settings: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      // Only admins can update settings
      if (context.userRole !== 'admin') {
        throw new ForbiddenError('Only admins can update workspace settings')
      }

      const updated = await this.workspaceRepository.updateSettings(
        context.workspaceId,
        settings
      )

      if (!updated) {
        throw new NotFoundError('Workspace')
      }

      return {}
    } catch (error) {
      throw error
    }
  }

  /**
   * Get member count
   */
  async getMemberCount(context: RequestContext): Promise<number> {
    try {
      return await this.userRepository.count({
        workspace_id: context.workspaceId,
        is_active: true
      })
    } catch (error) {
      throw error
    }
  }
}
