'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircle,
  Link,
  AlertCircle,
  Settings,
  Loader2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { PLATFORMS } from '@/constants'
import type { Platform } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const AccountSettingsTab: React.FC = () => {
  const { userRole, loading: authLoading } = useAuth()
  const [connectedAccounts, setConnectedAccounts] = useState<Record<Platform, boolean>>({
    twitter: false,
    linkedin: false,
    facebook: false,
    instagram: false,
    tiktok: false,
    youtube: false,
  })
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null)
  const [errors, setErrors] = useState<Record<Platform, string | undefined>>({
    twitter: undefined,
    linkedin: undefined,
    facebook: undefined,
    instagram: undefined,
    tiktok: undefined,
    youtube: undefined,
  })
  const [statusInfo, setStatusInfo] = useState<Record<Platform, any>>({
    twitter: {},
    linkedin: {},
    facebook: {},
    instagram: {},
    tiktok: {},
    youtube: {},
  })
  const [timeoutWarnings, setTimeoutWarnings] = useState<Set<Platform>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const oauthCallbackHandled = useRef(false)
  const effectRan = useRef(false)
  const renderCount = useRef(0)

  // Legacy query parameter support for older OAuth callbacks
  const LEGACY_SUCCESS_PARAMS: Record<string, Platform> = {
    facebook_connected: 'facebook',
    twitter_connected: 'twitter',
    linkedin_connected: 'linkedin',
    instagram_connected: 'instagram',
    tiktok_connected: 'tiktok',
    youtube_connected: 'youtube',
  }

  // Adaptive timeouts per platform
  const TIMEOUTS = {
    twitter: 45000, // 45 seconds
    linkedin: 60000, // 60 seconds
    facebook: 90000, // 90 seconds
    instagram: 90000, // 90 seconds
    tiktok: 60000, // 60 seconds
    youtube: 60000, // 60 seconds
  }

  // Define loadConnectionStatus function - will be recreated but that's okay
  // since it's only used in useEffect with empty deps
  const loadConnectionStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/credentials/status')

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to load status'
        try {
          const errorData = await response.json()
          errorMessage = errorData?.error || errorMessage
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
        }
        console.error('Failed to load connection status:', errorMessage)
        // Don't set errors here - let the component handle it
        setIsLoading(false)
        return
      }

      const data = await response.json()
      setStatusInfo(data)
      setConnectedAccounts(
        Object.fromEntries(
          Object.entries(data).map(([platform, info]: [string, any]) => [
            platform,
            info.isConnected,
          ])
        ) as Record<Platform, boolean>
      )
    } catch (error) {
      console.error('Failed to load connection status:', error)
      // Don't set errors here - let the component handle it
    } finally {
      // Always clear loading state
      setIsLoading(false)
    }
  }

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    // Only run the effect if we're not in a loading/unauthorized state
    // This prevents the effect from running when the component will return early
    if (authLoading || userRole !== 'admin') {
      return
    }

    // Check for OAuth callbacks FIRST to determine if we should skip guards
    const urlParams = new URLSearchParams(window.location.search)
    let successPlatform = urlParams.get('oauth_success') as Platform | null
    let errorCode = urlParams.get('oauth_error')

    // Track render count to detect infinite loops
    renderCount.current += 1
    if (renderCount.current > 10) {
      console.error('[AccountSettingsTab] Render count exceeded 10, possible infinite loop detected!')
      return
    }

    // Strict guard - prevent rapid re-executions
    // BUT: Skip guards if we have OAuth callback parameters (need to process them)
    const hasOAuthCallback = !!(successPlatform || errorCode)
    
    if (!hasOAuthCallback) {
      const now = Date.now()
      const lastRunKey = 'account_settings_last_run'
      const lastRun = sessionStorage.getItem(lastRunKey)
      
      // If ran within last 500ms, skip (prevents rapid re-executions)
      // Very short window to prevent infinite loops but allow legitimate navigation
      if (lastRun && (now - parseInt(lastRun)) < 500) {
        console.log('[AccountSettingsTab] Effect ran too recently, skipping')
        return
      }
      
      // Also check ref for current mount
      if (effectRan.current) {
        console.log('[AccountSettingsTab] Effect already ran this mount, skipping')
        return
      }
      
      // Mark as ran immediately, before any async operations
      effectRan.current = true
      sessionStorage.setItem(lastRunKey, now.toString())
    }
    
    console.log('[AccountSettingsTab] Effect running (render count:', renderCount.current, ')')

    // Support legacy `?platform_connected=true` query params from older callbacks
    if (!successPlatform) {
      for (const [param, platform] of Object.entries(LEGACY_SUCCESS_PARAMS)) {
        if (urlParams.get(param) === 'true') {
          successPlatform = platform
          break
        }
      }
    }

    // Support legacy `?error=...` params
    if (!errorCode) {
      const legacyError = urlParams.get('error')
      if (legacyError) {
        errorCode = legacyError
      }
    }
    
    // Mark guards as passed for OAuth callbacks
    if (hasOAuthCallback) {
      const now = Date.now()
      effectRan.current = true
      sessionStorage.setItem('account_settings_last_run', now.toString())
    }

    // If no OAuth callback params, just load status normally
    if (!successPlatform && !errorCode) {
      loadConnectionStatus()
      return
    }

    // For OAuth callbacks, check if we've already processed this specific callback
    // Use a combination of the URL params as a unique key
    const callbackKey = `${successPlatform || ''}_${errorCode || ''}`
    const lastProcessedKey = sessionStorage.getItem('last_oauth_callback')
    
    // If we've already processed this exact callback, just load status and return
    if (lastProcessedKey === callbackKey) {
      loadConnectionStatus()
      return
    }

    // Mark this callback as processed
    sessionStorage.setItem('last_oauth_callback', callbackKey)

    // If there's an error, handle it but still check if connection succeeded
    if (errorCode) {
      // Error - show to user
      console.error('OAuth error:', errorCode)

      // Try to detect platform from URL or error code
      let platform = detectPlatformFromError(errorCode)

      // If we can't detect from error code, check if there's a platform in the URL path
      if (!platform) {
        // Check if this was a callback from a specific platform
        const pathMatch = window.location.pathname.match(/\/settings/)
        if (pathMatch) {
          // For generic errors without platform info, check session storage for which platform was being connected
          const attemptedPlatform = sessionStorage.getItem('attempted_oauth_platform')
          if (attemptedPlatform && ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'].includes(attemptedPlatform)) {
            platform = attemptedPlatform as Platform
          }
        }
      }

      // For CSRF errors, still check if connection was successful
      // Sometimes the connection succeeds but CSRF check fails due to timing/state issues
      if (errorCode === 'csrf_check_failed' && platform) {
        console.warn(`CSRF check failed for ${platform}, but checking if connection was successful...`)
        // Don't set error yet - check status first
        setConnectingPlatform(null)
        // Clean up URL immediately
        window.history.replaceState({}, document.title, window.location.pathname + '?tab=accounts')
        
        // Clear loading immediately so page can render
        setIsLoading(false)
        
        // Load status with multiple retries to check if connection succeeded
        const checkConnectionWithRetries = async () => {
          const maxRetries = 3
          const retryDelays = [1000, 2000, 3000] // Total 6 seconds of checking
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]))
            }
            
            try {
              const response = await fetch('/api/credentials/status')
              if (response.ok) {
                const status = await response.json()
                const platformConnected = status[platform]?.isConnected
                
                if (platformConnected) {
                  // Platform is connected! Clear any errors and update state
                  console.log(`✅ ${platform} connection succeeded despite CSRF error (attempt ${attempt + 1})`)
                  setStatusInfo(status)
                  setConnectedAccounts(
                    Object.fromEntries(
                      Object.entries(status).map(([platform, info]: [string, any]) => [
                        platform,
                        info.isConnected,
                      ])
                    ) as Record<Platform, boolean>
                  )
                  setErrors(prev => ({
                    ...prev,
                    [platform]: undefined,
                  }))
                  return // Success, exit retry loop
                }
              }
            } catch (err) {
              console.error(`Error checking connection status (attempt ${attempt + 1}):`, err)
            }
          }
          
          // After all retries, if still not connected, show error
          console.warn(`❌ ${platform} connection failed after ${maxRetries} verification attempts`)
          const errorMessage = mapErrorCode(errorCode)
          setErrors(prev => ({
            ...prev,
            [platform]: errorMessage,
          }))
        }
        
        // Run the check with retries
        checkConnectionWithRetries()
        return
      }

      // For other errors, show immediately
      if (platform) {
        const errorMessage = mapErrorCode(errorCode)
        console.error(`Error for ${platform}:`, errorMessage)
        setErrors(prev => ({
          ...prev,
          [platform]: errorMessage,
        }))
      } else {
        console.warn('Could not detect platform from error:', errorCode)
        // Set a generic error if we can't detect platform
        setErrors(prev => ({
          ...prev,
          twitter: mapErrorCode(errorCode),
        }))
      }
      setConnectingPlatform(null)
      // Clean up URL immediately
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=accounts')
      // Clear loading immediately so page can render
      setIsLoading(false)
      // Load status in background without showing loading state
      // Use a separate function that doesn't set loading
      const loadStatusSilently = async () => {
        try {
          const response = await fetch('/api/credentials/status')
          if (response.ok) {
            const data = await response.json()
            setStatusInfo(data)
            setConnectedAccounts(
              Object.fromEntries(
                Object.entries(data).map(([platform, info]: [string, any]) => [
                  platform,
                  info.isConnected,
                ])
              ) as Record<Platform, boolean>
            )
          }
        } catch (err) {
          console.error('Failed to load connection status silently:', err)
        }
      }
      // Load in background without affecting loading state
      loadStatusSilently()
      return
    }

    if (successPlatform) {
      // Success - reload status with retry mechanism
      // Database transaction might still be in progress, so retry multiple times
      const retryLoadStatus = async () => {
        const maxRetries = 4
        const retryDelays = [1500, 1000, 2000, 3000] // milliseconds between retries

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          if (attempt > 0) {
            // Wait before retry (with exponential backoff)
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]))
          }

          try {
            setIsLoading(true)
            const response = await fetch('/api/credentials/status')
            if (!response.ok) throw new Error('Failed to load status')

            const status = await response.json()

            // Check if the platform we're looking for is now connected
            const platformConnected = status[successPlatform]?.isConnected

            if (platformConnected) {
              // Found credentials! Update state and we're done
              setStatusInfo(status)
              setConnectedAccounts(
                Object.fromEntries(
                  Object.entries(status).map(([platform, info]: [string, any]) => [
                    platform,
                    info.isConnected,
                  ])
                ) as Record<Platform, boolean>
              )
              setConnectingPlatform(null)
              console.log(`✅ Successfully connected ${successPlatform}`)
              break // Exit retry loop
            } else if (attempt === maxRetries - 1) {
              // Last attempt failed - show what we got
              setStatusInfo(status)
              setConnectedAccounts(
                Object.fromEntries(
                  Object.entries(status).map(([platform, info]: [string, any]) => [
                    platform,
                    info.isConnected,
                  ])
                ) as Record<Platform, boolean>
              )
              setConnectingPlatform(null)
              console.warn(`⚠️ ${successPlatform} credentials not found after ${maxRetries} attempts`)
            }
          } catch (err) {
            console.error(`Retry attempt ${attempt + 1} failed:`, err)
            if (attempt === maxRetries - 1) {
              // All retries failed
              setConnectingPlatform(null)
            }
          } finally {
            setIsLoading(false)
          }
        }
      }

      retryLoadStatus()
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=accounts')
      return
    }

    // This should not be reached if we have success/error, but just in case
    if (!oauthCallbackHandled.current) {
      loadConnectionStatus()
    }

    // Cleanup function - reset ref on unmount (though it shouldn't matter)
    return () => {
      // Don't reset effectRan - we want it to persist
      // This cleanup is just for safety
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userRole]) // Include dependencies to re-run when auth state changes

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate mr-2" />
        <span className="text-slate">Loading settings...</span>
      </div>
    )
  }

  // Check role - only admins can manage account settings
  if (userRole !== 'admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-semibold">Access Denied</p>
          <p>Only workspace admins can manage account connections.</p>
        </div>
      </div>
    )
  }

  const handleConnect = async (platform: Platform) => {
    setErrors(prev => ({ ...prev, [platform]: undefined }))
    setConnectingPlatform(platform)
    setTimeoutWarnings(new Set())

    // Store which platform is being attempted so we can track errors
    sessionStorage.setItem('attempted_oauth_platform', platform)

    try {
      // POST to initiate OAuth
      const response = await fetch(`/api/auth/oauth/${platform}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate connection')
      }

      const { redirectUrl } = await response.json()

      // Set timeout warning (show warning 30s before timeout)
      const timeoutMs = TIMEOUTS[platform]
      setTimeout(() => {
        if (connectingPlatform === platform) {
          setTimeoutWarnings(prev => new Set(prev).add(platform))
        }
      }, timeoutMs - 30000)

      // Set timeout to clear loading state
      const timeoutId = setTimeout(() => {
        if (connectingPlatform === platform) {
          setConnectingPlatform(null)
          setErrors(prev => ({
            ...prev,
            [platform]: 'Connection timed out. Please try again.',
          }))
        }
      }, timeoutMs) as any

      // Store timeout ID for cleanup
      (window as any)[`timeout_${platform}`] = timeoutId

      // Redirect to OAuth
      window.location.href = redirectUrl
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error)
      setErrors(prev => ({
        ...prev,
        [platform]: error instanceof Error ? error.message : 'Connection failed',
      }))
      setConnectingPlatform(null)
    }
  }

  const handleDisconnect = async (platform: Platform) => {
    try {
      const response = await fetch(`/api/credentials/${platform}/disconnect`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData?.details || errorData?.error || 'Failed to disconnect'
        throw new Error(errorMessage)
      }

      loadConnectionStatus()
      setErrors(prev => ({ ...prev, [platform]: undefined }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect'
      console.error('Failed to disconnect:', errorMessage)
      setErrors(prev => ({
        ...prev,
        [platform]: errorMessage,
      }))
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-charcoal-dark">Connected Accounts</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
        <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Production-Ready Integration</p>
          <p>
            Connect your social media accounts securely. Your credentials are encrypted and
            stored on our servers. Never stored in your browser.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate mr-2" />
          <span className="text-slate">Loading connection status...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {PLATFORMS.map(({ id, name, icon: Icon }) => {
            const isConnected = connectedAccounts[id]
            const isConnecting = connectingPlatform === id
            const error = errors[id]
            const info = statusInfo[id]
            const hasTimeout = timeoutWarnings.has(id)

            return (
              <div key={id} className="bg-light-gray rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Icon className="w-8 h-8 text-charcoal" />
                    <div className="flex-1">
                      <span className="text-lg font-medium text-charcoal-dark block">
                        {name}
                      </span>
                      {isConnected && info?.username && (
                        <div className="text-sm text-slate">
                          <span>@{info.username}</span>
                          {info.isExpired && (
                            <span className="ml-2 text-red-600 font-semibold">
                              Token Expired
                            </span>
                          )}
                          {info.isExpiringSoon && !info.isExpired && (
                            <span className="ml-2 text-orange-600 font-semibold">
                              Expiring Soon
                            </span>
                          )}
                        </div>
                      )}
                      {isConnected && info?.expiresAt && (
                        <span className="text-xs text-slate">
                          Expires: {typeof info.expiresAt === 'number' ? new Date(info.expiresAt * 1000).toLocaleDateString() : info.expiresAt}
                        </span>
                      )}
                    </div>
                  </div>

                  {isConnecting ? (
                    <div className="flex items-center gap-2 text-slate">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-semibold text-sm">Connecting...</span>
                    </div>
                  ) : isConnected ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-semibold text-sm">Connected</span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(id)}
                        className="px-4 py-2 text-sm font-medium bg-slate hover:bg-slate/80 rounded-md text-white transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(id)}
                      className="px-4 py-2 text-sm font-medium bg-charcoal hover:bg-charcoal-dark rounded-md text-white flex items-center transition-colors"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </button>
                  )}
                </div>

                {error && (
                  <div className="px-4 pb-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {hasTimeout && (
                  <div className="px-4 pb-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
                      <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-orange-800">
                        Connection is taking longer than expected. This window will close in 30
                        seconds.
                      </p>
                    </div>
                  </div>
                )}

                {isConnected && info?.isExpired && (
                  <div className="px-4 pb-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <p className="font-semibold">Token Expired</p>
                        <p>Please reconnect to refresh your credentials.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-slate/30">
        <p className="text-sm text-slate">
          <strong>Security:</strong> Your API credentials are encrypted using AES-256 encryption
          and stored securely on yor servers. We never store them in your browser.
        </p>
      </div>
    </div>
  )
}

function detectPlatformFromError(errorCode: string): Platform | null {
  if (errorCode.includes('twitter')) return 'twitter'
  if (errorCode.includes('linkedin')) return 'linkedin'
  if (errorCode.includes('facebook')) return 'facebook'
  if (errorCode.includes('instagram')) return 'instagram'
  return null
}

function mapErrorCode(errorCode: string): string {
  const messages: Record<string, string> = {
    oauth_unauthorized: 'Not authenticated. Please log in.',
    oauth_error: 'OAuth error during connection. Please try again.',
    insufficient_permissions: 'Only workspace admins can connect accounts. Contact your admin.',
    no_workspace: 'Workspace error. Please refresh and try again.',
    user_denied: 'You denied the connection request. Please try again if you want to connect.',
    missing_params: 'OAuth parameters missing. Please try again.',
    csrf_check_failed: 'Security verification failed. Please try again.',
    missing_verifier: 'Security token missing. Please restart connection.',
    callback_error: 'Connection callback failed. Please try again.',
    facebook_callback_error: 'Facebook connection callback failed. Please try again.',
    token_exchange_failed: 'Failed to exchange authorization code. Please try again.',
    invalid_scopes: 'Permission scope error. The app may need App Review approval from the platform. Please contact support.',
    facebook_invalid_scopes: 'Facebook permission scope error. The app may need App Review approval. Please contact support.',
    get_pages_failed: 'Failed to retrieve your pages. Ensure you manage at least one Facebook page and try again.',
    facebook_get_pages_failed: 'Failed to retrieve your Facebook pages. Ensure you manage at least one Facebook page and try again.',
    no_pages_found: 'You don\'t manage any Facebook pages. Create or request to manage a page, then try again.',
    facebook_no_pages_found: 'You don\'t manage any Facebook pages. Create a page or request to manage an existing page, then try again.',
    get_account_failed: 'Failed to retrieve your account. Please try again.',
    no_account_found: 'No account found. Please try again.',
    save_failed: 'Failed to save credentials. Please try again.',
    facebook_save_failed: 'Failed to save your Facebook credentials. Please try again.',
    config_missing: 'Platform is not configured. Please contact support.',
  }
  return messages[errorCode] || 'Connection failed. Please try again.'
}

export default AccountSettingsTab
