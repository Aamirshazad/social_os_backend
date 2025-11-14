/**
 * Email Service
 * Handles sending transactional emails via Resend
 */

import { Resend } from 'resend'
import InvitationEmail from '@/emails/invitation-email'
import WelcomeEmail from '@/emails/welcome-email'

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'noreply@socialmediaos.com'
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Social Media OS'

// Lazy initialize Resend to avoid errors at build time
let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

export class EmailService {
  /**
   * Send invitation email with invite link
   */
  static async sendInvitationEmail({
    to,
    workspaceName,
    role,
    invitationUrl,
    expiresAt,
    inviterName,
  }: {
    to: string
    workspaceName: string
    role: string
    invitationUrl: string
    expiresAt?: string | null
    inviterName?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const resendClient = getResend()
      const { data, error } = await resendClient.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: `You're invited to join ${workspaceName} on Social Media OS`,
        react: InvitationEmail({
          workspaceName,
          role,
          invitationUrl,
          expiresAt,
          inviterName,
        }) as any,
      })

      if (error) {
        console.error('Error sending invitation email:', error)
        return { success: false, error: error.message }
      }

      console.log('Invitation email sent:', { to, id: data?.id })
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to send invitation email:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Send welcome email after user joins workspace
   */
  static async sendWelcomeEmail({
    to,
    userName,
    workspaceName,
    dashboardUrl,
  }: {
    to: string
    userName: string
    workspaceName: string
    dashboardUrl: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const resendClient = getResend()
      const { data, error } = await resendClient.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: `Welcome to ${workspaceName}!`,
        react: WelcomeEmail({
          userName,
          workspaceName,
          dashboardUrl,
        }) as any,
      })

      if (error) {
        console.error('Error sending welcome email:', error)
        return { success: false, error: error.message }
      }

      console.log('Welcome email sent:', { to, id: data?.id })
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to send welcome email:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Send role change notification
   */
  static async sendRoleChangeEmail({
    to,
    userName,
    workspaceName,
    newRole,
    dashboardUrl,
  }: {
    to: string
    userName: string
    workspaceName: string
    newRole: string
    dashboardUrl: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const resendClient = getResend()
      const { data, error } = await resendClient.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: `Your role in ${workspaceName} has been updated`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Role Update</h2>
            <p>Hi ${userName},</p>
            <p>Your role in <strong>${workspaceName}</strong> has been updated to <strong>${newRole}</strong>.</p>
            <p>
              <a href="${dashboardUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <p>Best regards,<br/>Social Media OS Team</p>
          </div>
        `,
      })

      if (error) {
        console.error('Error sending role change email:', error)
        return { success: false, error: error.message }
      }

      console.log('Role change email sent:', { to, id: data?.id })
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to send role change email:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }
}
