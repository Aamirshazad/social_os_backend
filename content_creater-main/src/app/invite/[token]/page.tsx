'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, CheckCircle, Loader2, LogIn } from 'lucide-react'
import Link from 'next/link'

interface InviteData {
  workspace_id: string
  workspace_name?: string
  email?: string
  role: string
  expires_at?: string
  is_expired: boolean
  time_remaining?: number
}

interface AcceptInviteResponse {
  success: boolean
  message: string
  workspace_id?: string
  error?: string
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const token = params.token

  // Validate invite token
  useEffect(() => {
    const validateInvite = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/workspace/invites/${token}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Invalid invitation')
        }

        const data = await response.json()
        setInviteData(data)

        // Check if already expired
        if (data.is_expired) {
          setError('This invitation has expired')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to validate invitation')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      validateInvite()
    }
  }, [token])

  // Handle accept invitation
  const handleAcceptInvite = async () => {
    try {
      setIsAccepting(true)
      setError(null)

      const response = await fetch('/api/workspace/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data: AcceptInviteResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to accept invitation')
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  // If user not logged in, redirect to login
  if (!authLoading && !user) {
    const redirectUrl = `/login?redirect=/invite/${token}`
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <LogIn className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-charcoal-dark mb-4">Sign In Required</h2>
          <p className="text-slate mb-6">
            Please sign in or create an account to accept this invitation.
          </p>
          <Link
            href={redirectUrl}
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign In or Sign Up
          </Link>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate">Loading invitation details...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-charcoal-dark mb-4">
            Welcome to the workspace!
          </h2>
          <p className="text-slate mb-6">
            You've successfully accepted the invitation and joined the workspace. Redirecting you
            to the dashboard...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-charcoal-dark mb-4 text-center">
            Invitation Error
          </h2>
          <p className="text-slate mb-6 text-center">{error}</p>
          <Link
            href="/"
            className="inline-block w-full text-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Main invite acceptance screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-charcoal-dark mb-2">You're Invited!</h2>
        <p className="text-slate mb-6">Join the workspace to start collaborating</p>

        {inviteData && (
          <>
            {/* Workspace Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-slate">Workspace</p>
                  <p className="text-lg font-semibold text-charcoal-dark">
                    {inviteData.workspace_name || 'Your workspace'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-slate">Your Role</p>
                <p className="text-lg font-semibold text-charcoal-dark capitalize">{inviteData.role}</p>
              </div>

              {inviteData.expires_at && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-slate">
                    Expires:{' '}
                    {new Date(inviteData.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate mb-1">Signing in as</p>
              <p className="text-base font-medium text-charcoal-dark break-all">{user?.email}</p>
            </div>

            {/* Accept Button */}
            <button
              onClick={handleAcceptInvite}
              disabled={isAccepting}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Accept Invitation
                </>
              )}
            </button>

            {/* Decline Option */}
            <p className="text-center text-sm text-slate mt-4">
              Changed your mind?{' '}
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                Go to dashboard
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
