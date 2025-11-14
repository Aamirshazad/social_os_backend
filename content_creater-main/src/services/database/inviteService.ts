/**
 * Invite Service
 * Manages workspace invitations with security features
 * Includes: token generation, validation, expiry checking, email verification
 */

import { createServerClient } from '@/lib/supabase/server'
import type { WorkspaceInvite, CreateInviteInput } from '@/types/workspace'
import { logWorkspaceAction } from './auditLogService'
import { EmailService } from '@/services/emailService'
import crypto from 'crypto'

/**
 * Invite Service - Static methods for invitation management
 * Handles creation, validation, acceptance, and revocation of invitations
 */
export class InviteService {
  /**
   * Generate a cryptographically secure random token
   * Used for both shareable links and email invitations
   *
   * @returns URL-safe base64 encoded 32-byte random token
   * @throws Never throws - always generates valid token
   */
  private static generateToken(): string {
    // Generate 32 random bytes (256 bits of entropy)
    // base64url encoding is safe for URLs (no +, /, = characters)
    return crypto.randomBytes(32).toString('base64url')
  }

  /**
   * Calculate expiration date based on days
   * Returns ISO timestamp or null for never-expiring invites
   *
   * @param days - Number of days until expiration (null = never expires)
   * @returns ISO timestamp string or null
   */
  private static calculateExpiration(days?: number | null): string | null {
    if (!days || days <= 0) return null

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + days)
    return expiryDate.toISOString()
  }

  /**
   * Create a new invitation
   * Generates a secure token and stores invitation record
   * Supports both email-specific and shareable link invitations
   *
   * @param workspaceId - Workspace to invite to
   * @param input - Invitation details (email optional, role required, expiry optional)
   * @param invitedBy - User ID creating the invite
   * @returns Created invite object or null if failed
   */
  static async createInvite(
    workspaceId: string,
    input: CreateInviteInput,
    invitedBy: string
  ): Promise<WorkspaceInvite | null> {
    try {
      const supabase = await createServerClient()

      // Validate input
      const validRoles = ['admin', 'editor', 'viewer']
      if (!validRoles.includes(input.role)) {
        console.warn('Invalid role in createInvite:', input.role)
        return null
      }

      // Validate email if provided
      if (input.email && !input.email.includes('@')) {
        console.warn('Invalid email format:', input.email)
        return null
      }

      // Generate unique secure token
      const token = this.generateToken()

      // Calculate expiration time
      const expiresAt = this.calculateExpiration(input.expiresInDays)

      // Create the invitation in database
      const { data, error } = await (supabase
        .from('workspace_invites') as any)
        .insert({
          workspace_id: workspaceId,
          email: input.email || null, // NULL for shareable links
          role: input.role,
          token,
          expires_at: expiresAt,
          invited_by: invitedBy,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating invite:', error)
        return null
      }

      // Log the action
      await logWorkspaceAction({
        workspaceId,
        userId: invitedBy,
        action: 'member_invited',
        entityType: 'workspace_invite',
        entityId: data.id,
        details: {
          invite_email: input.email || 'shareable_link',
          invite_role: input.role,
          expires_at: expiresAt,
        },
      })

      // Send email invitation if email provided
      if (input.email && data.token) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const invitationUrl = `${baseUrl}/invite/${data.token}`

          // Get inviter name
          const { data: inviterData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', invitedBy)
            .single()

          const inviterName = (inviterData as any)?.full_name || 'Your colleague'

          // Get workspace name
          const { data: workspaceData } = await supabase
            .from('workspaces')
            .select('name')
            .eq('id', workspaceId)
            .single()

          const workspaceName = (workspaceData as any)?.name || 'the workspace'

          await EmailService.sendInvitationEmail({
            to: input.email,
            workspaceName,
            role: input.role,
            invitationUrl,
            expiresAt,
            inviterName,
          })

          console.log('Invitation email sent to:', input.email)
        } catch (emailError) {
          // Don't fail the invite creation if email fails
          console.error('Failed to send invitation email:', emailError)
        }
      }

      return data as WorkspaceInvite
    } catch (error) {
      console.error('Unexpected error in createInvite:', error)
      return null
    }
  }

  /**
   * Get all pending invitations for a workspace
   * Used by admins to view and manage active invites
   *
   * @param workspaceId - Workspace to get invites for
   * @returns Array of pending invites, empty array if none or error
   */
  static async getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('used_at', null) // Only pending (unused) invites
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching workspace invites:', error)
        return []
      }

      return data as WorkspaceInvite[]
    } catch (error) {
      console.error('Unexpected error in getWorkspaceInvites:', error)
      return []
    }
  }

  /**
   * Validate an invitation token
   * Checks: token exists, not already used, not expired
   * Safe to call from public endpoints
   *
   * @param token - Invitation token to validate
   * @returns Valid invite object or null if invalid/expired/used
   */
  static async validateInvite(token: string): Promise<WorkspaceInvite | null> {
    try {
      const supabase = await createServerClient()

      // Find the invite by token
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('token', token)
        .is('used_at', null) // Must not be already used
        .single()

      if (error || !data) {
        // Token not found or already used
        return null
      }

      const invite = data as WorkspaceInvite

      // Check if invite has expired
      if (invite.expires_at) {
        const expiryDate = new Date(invite.expires_at)
        const now = new Date()

        if (now > expiryDate) {
          // Invite has expired
          return null
        }
      }

      // Token is valid
      return invite
    } catch (error) {
      console.error('Unexpected error in validateInvite:', error)
      return null
    }
  }

  /**
   * Accept an invitation and add user to workspace
   * Updates user's workspace and role, marks invite as used
   * Called when user clicks invite link and is logged in
   *
   * @param token - Invitation token to accept
   * @param userId - User ID accepting the invite
   * @returns Success boolean
   */
  static async acceptInvite(token: string, userId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient()

      // Step 1: Validate the invite (must be valid and not expired)
      const invite = await this.validateInvite(token)
      if (!invite) {
        console.warn('Invalid or expired invitation token')
        return false
      }

      // Step 2: Get user's current information
      const { data: userData } = await supabase
        .from('users')
        .select('email, workspace_id')
        .eq('id', userId)
        .single()

      if (!userData) {
        console.warn('User not found:', userId)
        return false
      }

      // Step 3: For email invites, verify email matches
      if (invite.email && invite.email !== (userData as any).email) {
        console.warn('Email mismatch for email-specific invite')
        return false // Email doesn't match the invite recipient
      }

      // Step 4: Update user's workspace assignment and role
      const { error: updateError } = await (supabase
        .from('users') as any)
        .update({
          workspace_id: invite.workspace_id,
          role: invite.role,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating user workspace:', updateError)
        return false
      }

      // Step 5: Mark invite as used
      const { error: inviteError } = await (supabase
        .from('workspace_invites') as any)
        .update({
          used_at: new Date().toISOString(),
          used_by: userId,
        })
        .eq('id', invite.id)

      if (inviteError) {
        console.error('Error marking invite as used:', inviteError)
        // This is not fatal - user is already in workspace
        // But we should log it
      }

      // Step 6: Log the action
      await logWorkspaceAction({
        workspaceId: invite.workspace_id,
        userId,
        action: 'member_joined',
        entityType: 'workspace_invite',
        entityId: invite.id,
        details: {
          invite_id: invite.id,
          role: invite.role,
          invited_by: invite.invited_by,
          previous_workspace_id: (userData as any).workspace_id,
        },
      })

      return true
    } catch (error) {
      console.error('Unexpected error in acceptInvite:', error)
      return false
    }
  }

  /**
   * Revoke (cancel) an invitation
   * Deletes the invite so it cannot be used
   * Only admins can do this
   *
   * @param inviteId - Invite ID to revoke
   * @param workspaceId - Workspace (for verification)
   * @param revokedBy - Admin performing the action
   * @returns Success boolean
   */
  static async revokeInvite(
    inviteId: string,
    workspaceId: string,
    revokedBy: string
  ): Promise<boolean> {
    try {
      const supabase = await createServerClient()

      // Get invite details before deleting (for audit log)
      const { data: invite } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('workspace_id', workspaceId) // Verify workspace match
        .single()

      if (!invite) {
        console.warn('Invite not found for revocation:', inviteId)
        return false
      }

      // Delete the invite
      const { error } = await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', inviteId)
        .eq('workspace_id', workspaceId)

      if (error) {
        console.error('Error revoking invite:', error)
        return false
      }

      // Log the action
      await logWorkspaceAction({
        workspaceId,
        userId: revokedBy,
        action: 'invite_revoked',
        entityType: 'workspace_invite',
        entityId: inviteId,
        details: {
          invite_email: (invite as any).email || 'shareable_link',
          invite_role: (invite as any).role,
          expires_at: (invite as any).expires_at,
        },
      })

      return true
    } catch (error) {
      console.error('Unexpected error in revokeInvite:', error)
      return false
    }
  }

  /**
   * Resend an invitation email
   * Creates a new invite with same role and workspace
   * Used when user wants to send invite to same email again
   *
   * @param inviteId - Original invite ID to reference
   * @param workspaceId - Workspace
   * @param resendBy - Admin performing the resend
   * @returns New invite object or null if failed
   */
  static async resendInvite(
    inviteId: string,
    workspaceId: string,
    resendBy: string
  ): Promise<WorkspaceInvite | null> {
    try {
      // Get original invite details
      const supabase = await createServerClient()

      const { data: originalInvite } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('workspace_id', workspaceId)
        .single()

      if (!originalInvite || !(originalInvite as any).email) {
        console.warn('Original invite not found or is not email-based:', inviteId)
        return null
      }

      // Create new invite with same details
      return await this.createInvite(
        workspaceId,
        {
          email: (originalInvite as any).email,
          role: (originalInvite as any).role,
        },
        resendBy
      )
    } catch (error) {
      console.error('Unexpected error in resendInvite:', error)
      return null
    }
  }

  /**
   * Check if invite is expired
   * Utility method to check expiration status
   *
   * @param expiresAt - Expiration date ISO string or null
   * @returns True if expired, false if valid or never expires
   */
  static isInviteExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false // Never expires
    return new Date() > new Date(expiresAt)
  }

  /**
   * Get time remaining for invite
   * Utility method to display countdown
   *
   * @param expiresAt - Expiration date ISO string or null
   * @returns Time remaining in milliseconds, 0 if expired, Infinity if never expires
   */
  static getTimeRemaining(expiresAt: string | null): number {
    if (!expiresAt) return Infinity // Never expires
    const remaining = new Date(expiresAt).getTime() - Date.now()
    return Math.max(remaining, 0)
  }
}
