'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
// TODO: MigrationService needs to be called from an API endpoint, not directly from client
// import { MigrationService } from '@/services/database'
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'

export default function MigrationBanner() {
  const { user, workspaceId } = useAuth()
  const [needsMigration, setNeedsMigration] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if migration is needed - disabled for now
    const checkMigration = () => {
      // TODO: Call API endpoint instead of direct service
      // const needs = MigrationService.needsMigration()
      const needs = false
      setNeedsMigration(needs)

      // Check if user dismissed the banner in this session
      const dismissed = sessionStorage.getItem('migration_banner_dismissed')
      if (dismissed) {
        setDismissed(true)
      }
    }

    checkMigration()
  }, [])

  const handleMigrate = async () => {
    if (!user || !workspaceId) return

    setMigrating(true)
    try {
      // TODO: Call migration API endpoint instead of direct service
      // const result = await MigrationService.migrateAllData(user.id, workspaceId)
      const result = { success: false, postsCount: 0, campaignsCount: 0, credentialsCount: 0 }
      setMigrationResult(result)

      if (result.success) {
        // Clear localStorage data after successful migration
        // MigrationService.clearLocalStorageData()
        setNeedsMigration(false)

        // Reload the page to refresh all data from database
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error('Migration failed:', error)
      setMigrationResult({
        success: false,
        postsCount: 0,
        campaignsCount: 0,
        credentialsCount: 0,
        errors: ['Migration failed: ' + (error as Error).message],
      })
    } finally {
      setMigrating(false)
    }
  }

  const handleSkip = () => {
    // Mark migration as completed to stop showing this banner
    localStorage.setItem('migration_completed', 'true')
    setNeedsMigration(false)
    setDismissed(true)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('migration_banner_dismissed', 'true')
    setDismissed(true)
  }

  if (!needsMigration || dismissed) return null

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-900">
            Migrate your data to the cloud
          </h3>
          <div className="mt-2 text-sm text-blue-800">
            <p>
              We've upgraded to a cloud database! Your existing data (posts, campaigns,
              credentials) is currently stored locally in your browser. Click "Migrate Now" to
              securely transfer it to the cloud database.
            </p>
          </div>

          {migrationResult && (
            <div
              className={`mt-3 p-3 rounded ${
                migrationResult.success
                  ? 'bg-green-100 border border-green-300'
                  : 'bg-red-100 border border-red-300'
              }`}
            >
              {migrationResult.success ? (
                <div className="flex items-center text-green-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <div>
                    <p className="font-medium">Migration successful!</p>
                    <p className="text-sm">
                      Migrated {migrationResult.postsCount} posts, {migrationResult.campaignsCount}{' '}
                      campaigns, and {migrationResult.credentialsCount} platform credentials.
                      Refreshing...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-red-800">
                  <p className="font-medium">Migration encountered errors:</p>
                  <ul className="text-sm list-disc list-inside mt-1">
                    {migrationResult.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  <p className="text-sm mt-2">
                    Partial migration: {migrationResult.postsCount} posts,{' '}
                    {migrationResult.campaignsCount} campaigns, {migrationResult.credentialsCount}{' '}
                    credentials
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                'Migrate Now'
              )}
            </button>
            <button
              onClick={handleSkip}
              disabled={migrating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Skip (Keep local data)
            </button>
            <button
              onClick={handleDismiss}
              disabled={migrating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Remind me later
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={handleDismiss}
            className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
