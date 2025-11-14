'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import AuthPage from './AuthPage'
import { Loader2 } from 'lucide-react'

interface ProtectedAppProps {
  children: React.ReactNode
}

export default function ProtectedApp({ children }: ProtectedAppProps) {
  const { user, loading } = useAuth()
  const [showLoader, setShowLoader] = useState(false)

  // Only show loader if loading takes more than 300ms (prevents flash)
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (loading) {
      timer = setTimeout(() => setShowLoader(true), 300)
    } else {
      setShowLoader(false)
    }
    return () => clearTimeout(timer)
  }, [loading])

  // Show loading screen only if loading for more than 300ms
  if (loading && showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-charcoal animate-spin mx-auto mb-4" />
          <p className="text-slate">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth page if not authenticated
  if (!user && !loading) {
    return <AuthPage />
  }

  // Show protected content if authenticated (wrapped with NotificationProvider for settings routes)
  if (user) {
    return (
      <NotificationProvider>
        {children}
      </NotificationProvider>
    )
  }

  // Return null during initial check (prevents flash before timeout)
  return null
}
