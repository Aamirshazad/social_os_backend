'use client'

import React, { useState } from 'react'
import { X, Mail, Link as LinkIcon, Copy, Check, Loader2 } from 'lucide-react'
import type { UserRole, CreateInviteInput } from '@/types/workspace'
import { RoleBadge } from '@/components/ui/RoleBadge'
import toast from 'react-hot-toast'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInviteCreated: () => void
}

/**
 * Invite Member Modal
 * Modal dialog for inviting members via email or shareable link
 * Features:
 * - Email-specific invitations
 * - Shareable links
 * - Role selection
 * - Expiration settings
 */
export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInviteCreated,
}) => {
  // Email invitation state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('editor')
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Shareable link state
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState<'email' | 'link'>('email')

  /**
   * Close modal and reset all state
   */
  const handleClose = () => {
    setEmail('')
    setRole('editor')
    setExpiresInDays(7)
    setGeneratedLink(null)
    setLinkCopied(false)
    setActiveTab('email')
    setIsSubmitting(false)
    onClose()
  }

  /**
   * Send email invitation
   */
  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const inviteData: CreateInviteInput = {
        email,
        role,
        expiresInDays: expiresInDays || undefined,
      }

      const response = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      const { data } = await response.json()

      toast.success(`Invitation sent to ${email}`)
      setGeneratedLink(data.inviteUrl)
      onInviteCreated()

      // Reset email form
      setEmail('')
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Generate shareable link
   */
  const handleGenerateLink = async () => {
    setIsSubmitting(true)

    try {
      const inviteData: CreateInviteInput = {
        role,
        expiresInDays: expiresInDays || undefined,
      }

      const response = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate link')
      }

      const { data } = await response.json()

      setGeneratedLink(data.inviteUrl)
      toast.success('Invite link generated')
      onInviteCreated()
    } catch (error) {
      console.error('Error generating link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate link')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = async () => {
    if (!generatedLink) return

    try {
      await navigator.clipboard.writeText(generatedLink)
      setLinkCopied(true)
      toast.success('Link copied to clipboard')

      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-slate/30">
          <h2 className="text-2xl font-bold text-charcoal-dark">
            Invite Team Members
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate hover:bg-slate/10 hover:text-charcoal-dark transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate/30">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'email'
                ? 'text-charcoal-dark border-b-2 border-charcoal'
                : 'text-slate hover:text-charcoal-dark'
            }`}
          >
            <Mail className="w-5 h-5" />
            Email Invitation
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'link'
                ? 'text-charcoal-dark border-b-2 border-charcoal'
                : 'text-slate hover:text-charcoal-dark'
            }`}
          >
            <LinkIcon className="w-5 h-5" />
            Shareable Link
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'email' ? (
            // EMAIL TAB
            <form onSubmit={handleEmailInvite} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-charcoal-dark mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 border border-slate/30 rounded-lg focus:ring-2 focus:ring-charcoal focus:border-charcoal"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-slate mt-1">
                  An invitation email will be sent to this address with a secure link
                </p>
              </div>

              {/* Role Selection */}
              <RoleSelector selectedRole={role} onRoleChange={setRole} />

              {/* Expiration */}
              <ExpirationSelector
                expiresInDays={expiresInDays}
                onExpirationChange={setExpiresInDays}
              />

              {/* Generated Link Display */}
              {generatedLink && (
                <GeneratedLinkDisplay
                  link={generatedLink}
                  onCopy={handleCopyLink}
                  copied={linkCopied}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-charcoal text-white rounded-lg hover:bg-charcoal-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Invitation
                  </>
                )}
              </button>
            </form>
          ) : (
            // LINK TAB
            <LinkTabContent
              role={role}
              onRoleChange={setRole}
              expiresInDays={expiresInDays}
              onExpirationChange={setExpiresInDays}
              generatedLink={generatedLink}
              isSubmitting={isSubmitting}
              onGenerateLink={handleGenerateLink}
              linkCopied={linkCopied}
              onCopyLink={handleCopyLink}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Role Selector Component
 */
interface RoleSelectorProps {
  selectedRole: UserRole
  onRoleChange: (role: UserRole) => void
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleChange,
}) => (
  <div>
    <label className="block text-sm font-medium text-charcoal-dark mb-2">
      Role <span className="text-red-500">*</span>
    </label>
    <div className="grid grid-cols-3 gap-3">
      {(['admin', 'editor', 'viewer'] as UserRole[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onRoleChange(r)}
          className={`p-3 border-2 rounded-lg transition-all ${
            selectedRole === r
              ? 'border-charcoal bg-charcoal/5'
              : 'border-slate/30 hover:border-slate/50'
          }`}
        >
          <RoleBadge role={r} size="sm" />
          <p className="text-xs text-slate mt-2 text-center">
            {r === 'admin' && 'Full control'}
            {r === 'editor' && 'Create & edit'}
            {r === 'viewer' && 'View only'}
          </p>
        </button>
      ))}
    </div>
  </div>
)

/**
 * Expiration Selector Component
 */
interface ExpirationSelectorProps {
  expiresInDays: number | null
  onExpirationChange: (days: number | null) => void
}

const ExpirationSelector: React.FC<ExpirationSelectorProps> = ({
  expiresInDays,
  onExpirationChange,
}) => (
  <div>
    <label className="block text-sm font-medium text-charcoal-dark mb-2">
      Link Expiration
    </label>
    <select
      value={expiresInDays?.toString() || 'never'}
      onChange={(e) =>
        onExpirationChange(e.target.value === 'never' ? null : parseInt(e.target.value))
      }
      className="w-full px-4 py-2 border border-slate/30 rounded-lg focus:ring-2 focus:ring-charcoal focus:border-charcoal"
    >
      <option value="1">24 hours</option>
      <option value="7">7 days</option>
      <option value="30">30 days</option>
      <option value="never">Never expires</option>
    </select>
  </div>
)

/**
 * Generated Link Display Component
 */
interface GeneratedLinkDisplayProps {
  link: string
  onCopy: () => void
  copied: boolean
}

const GeneratedLinkDisplay: React.FC<GeneratedLinkDisplayProps> = ({
  link,
  onCopy,
  copied,
}) => (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <p className="text-sm font-medium text-green-800 mb-2">
      Invitation link generated:
    </p>
    <div className="flex gap-2">
      <input
        type="text"
        value={link}
        readOnly
        className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono text-slate"
      />
      <button
        type="button"
        onClick={onCopy}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy
          </>
        )}
      </button>
    </div>
  </div>
)

export default InviteMemberModal

/**
 * Link Tab Content Component
 */
interface LinkTabContentProps {
  role: UserRole
  onRoleChange: (role: UserRole) => void
  expiresInDays: number | null
  onExpirationChange: (days: number | null) => void
  generatedLink: string | null
  isSubmitting: boolean
  onGenerateLink: () => Promise<void>
  linkCopied: boolean
  onCopyLink: () => Promise<void>
}

const LinkTabContent: React.FC<LinkTabContentProps> = ({
  role,
  onRoleChange,
  expiresInDays,
  onExpirationChange,
  generatedLink,
  isSubmitting,
  onGenerateLink,
  linkCopied,
  onCopyLink,
}) => (
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-800">
        Generate a shareable link that anyone can use to join your workspace.
        No email required!
      </p>
    </div>

    <RoleSelector selectedRole={role} onRoleChange={onRoleChange} />
    <ExpirationSelector expiresInDays={expiresInDays} onExpirationChange={onExpirationChange} />

    {generatedLink ? (
      <GeneratedLinkDisplay link={generatedLink} onCopy={onCopyLink} copied={linkCopied} />
    ) : (
      <button
        onClick={onGenerateLink}
        disabled={isSubmitting}
        className="w-full px-4 py-3 bg-charcoal text-white rounded-lg hover:bg-charcoal-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <LinkIcon className="w-5 h-5" />
            Generate Invite Link
          </>
        )}
      </button>
    )}
  </div>
)
