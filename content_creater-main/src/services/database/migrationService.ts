/**
 * Migration Service
 * Handles one-time migration of data from localStorage to Supabase
 */

import { PostService } from './postService'
import { CredentialService } from './credentialService'
import { Post, PlatformCredentials } from '@/types'

export class MigrationService {
  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    // Check if there's data in localStorage
    const hasPosts = localStorage.getItem('socialMediaPosts') !== null
    const hasCredentials = localStorage.getItem('social_media_credentials') !== null

    // Check if migration has been completed before
    const migrationCompleted = localStorage.getItem('migration_completed') === 'true'

    return (hasPosts || hasCredentials) && !migrationCompleted
  }

  /**
   * Migrate all data from localStorage to Supabase
   */
  static async migrateAllData(userId: string, workspaceId: string): Promise<{
    success: boolean
    postsCount: number
    credentialsCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let postsCount = 0
    let credentialsCount = 0

    try {
      // Migrate posts
      const postsMigrationResult = await this.migratePosts(userId, workspaceId)
      postsCount = postsMigrationResult.count
      if (postsMigrationResult.errors.length > 0) {
        errors.push(...postsMigrationResult.errors)
      }

      // Migrate credentials
      const credentialsMigrationResult = await this.migrateCredentials(userId, workspaceId)
      credentialsCount = credentialsMigrationResult.count
      if (credentialsMigrationResult.errors.length > 0) {
        errors.push(...credentialsMigrationResult.errors)
      }

      // Mark migration as completed
      localStorage.setItem('migration_completed', 'true')

      return {
        success: errors.length === 0,
        postsCount,
        credentialsCount,
        errors,
      }
    } catch (error) {
      console.error('Migration error:', error)
      errors.push('Failed to complete migration: ' + (error as Error).message)
      return {
        success: false,
        postsCount,
        credentialsCount,
        errors,
      }
    }
  }

  /**
   * Migrate posts from localStorage
   */
  private static async migratePosts(userId: string, workspaceId: string): Promise<{
    count: number
    errors: string[]
  }> {
    const errors: string[] = []
    let count = 0

    try {
      const postsJson = localStorage.getItem('socialMediaPosts')
      if (!postsJson) return { count: 0, errors: [] }

      const posts: Post[] = JSON.parse(postsJson)

      for (const post of posts) {
        try {
          // Check if post already exists in database
          const existing = await PostService.getPostById(post.id, workspaceId)
          if (existing) {
            console.log(`Post ${post.id} already exists, skipping`)
            continue
          }

          await PostService.createPost(post, userId, workspaceId)
          count++
        } catch (error) {
          console.error(`Error migrating post ${post.id}:`, error)
          errors.push(`Failed to migrate post "${post.topic}": ${(error as Error).message}`)
        }
      }
    } catch (error) {
      console.error('Error parsing posts from localStorage:', error)
      errors.push('Failed to parse posts from localStorage')
    }

    return { count, errors }
  }

  /**
   * Migrate credentials from localStorage
   */
  private static async migrateCredentials(userId: string, workspaceId: string): Promise<{
    count: number
    errors: string[]
  }> {
    const errors: string[] = []
    let count = 0

    try {
      const credentialsObfuscated = localStorage.getItem('social_media_credentials')
      if (!credentialsObfuscated) return { count: 0, errors: [] }

      // Deobfuscate (reverse + base64 decode)
      const reversed = credentialsObfuscated.split('').reverse().join('')
      const credentialsJson = atob(reversed)
      const credentials: PlatformCredentials = JSON.parse(credentialsJson)

      for (const [platform, platformCredentials] of Object.entries(credentials)) {
        try {
          if (!platformCredentials) continue

          // Check if credentials already exist
          const status = await CredentialService.getConnectionStatus(workspaceId)
          if ((status as any)[platform]?.isConnected) {
            console.log(`Credentials for ${platform} already exist, skipping`)
            continue
          }

          await CredentialService.savePlatformCredentials(
            platform as any,
            platformCredentials as any,
            userId,
            workspaceId
          )
          count++
        } catch (error) {
          console.error(`Error migrating credentials for ${platform}:`, error)
          errors.push(`Failed to migrate ${platform} credentials: ${(error as Error).message}`)
        }
      }
    } catch (error) {
      console.error('Error parsing credentials from localStorage:', error)
      errors.push('Failed to parse credentials from localStorage')
    }

    return { count, errors }
  }

  /**
   * Clear localStorage data after successful migration
   */
  static clearLocalStorageData(): void {
    try {
      localStorage.removeItem('socialMediaPosts')
      localStorage.removeItem('campaigns')
      localStorage.removeItem('social_media_credentials')
      console.log('LocalStorage data cleared after migration')
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  /**
   * Reset migration status (for testing)
   */
  static resetMigrationStatus(): void {
    localStorage.removeItem('migration_completed')
  }
}
