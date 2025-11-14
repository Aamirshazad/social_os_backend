/**
 * Post Library Service
 * Manages archived/published posts in the post_library table
 * Provides permanent storage for published content with analytics tracking
 *
 * NOTE: This service methods should only be called from server-side contexts
 * (API routes, server actions, or via createServerClient which is server-only)
 */

import { createServerClient } from '@/lib/supabase/server'

export interface LibraryPost {
  id: string
  workspace_id: string
  original_post_id?: string
  title?: string
  topic: string
  post_type: string
  platforms: string[]
  content: Record<string, any>
  published_at: string
  platform_data: Record<string, any>
  metrics?: Record<string, any>
  created_by?: string
  created_at: string
  updated_at: string
}

export class PostLibraryService {
  /**
   * Archive a published post to library
   * Called after successful publishing to platforms
   */
  static async archivePost(
    post: any,
    platformResults: any[],
    workspaceId: string,
    userId: string
  ): Promise<LibraryPost> {
    try {
      const supabase = await createServerClient()

      // Transform platform results into platform_data object
      const platform_data: Record<string, any> = {}
      platformResults.forEach((result) => {
        platform_data[result.platform] = {
          post_id: result.postId,
          url: result.url,
          status: result.success ? 'published' : 'failed',
          error: result.error || null,
          published_at: new Date().toISOString(),
        }
      })

      const { data, error } = await (supabase
        .from('post_library') as any)
        .insert([{
          id: crypto.randomUUID(),
          workspace_id: workspaceId,
          original_post_id: post.id,
          title: post.topic,
          topic: post.topic,
          post_type: post.postType || 'post',
          platforms: post.platforms || [],
          content: post.content || {},
          published_at: new Date().toISOString(),
          platform_data,
          created_by: userId,
        }])
        .select()
        .single()

      if (error) {
        console.error('Error archiving post to library:', error)
        throw error
      }

      return data as LibraryPost
    } catch (error) {
      console.error('PostLibraryService.archivePost failed:', error)
      throw error
    }
  }

  /**
   * Get all published posts from library
   */
  static async getLibraryPosts(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ items: LibraryPost[]; total: number }> {
    try {
      const supabase = await createServerClient()

      // Get total count
      const { count } = await supabase
        .from('post_library')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      // Get paginated results
      const { data, error } = await supabase
        .from('post_library')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        items: (data || []) as LibraryPost[],
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching library posts:', error)
      return { items: [], total: 0 }
    }
  }

  /**
   * Get library post by ID
   */
  static async getLibraryPostById(
    id: string,
    workspaceId: string
  ): Promise<LibraryPost | null> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('post_library')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) throw error
      return (data as LibraryPost) || null
    } catch (error) {
      console.error('Error fetching library post by ID:', error)
      return null
    }
  }

  /**
   * Search library posts by topic, title, or content
   */
  static async searchLibrary(
    workspaceId: string,
    query: string,
    limit: number = 50
  ): Promise<LibraryPost[]> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('post_library')
        .select('*')
        .eq('workspace_id', workspaceId)
        .or(`topic.ilike.%${query}%,title.ilike.%${query}%`)
        .order('published_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data || []) as LibraryPost[]
    } catch (error) {
      console.error('Error searching library:', error)
      return []
    }
  }

  /**
   * Filter library by platform
   */
  static async getLibraryByPlatform(
    workspaceId: string,
    platform: string,
    limit: number = 50
  ): Promise<LibraryPost[]> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('post_library')
        .select('*')
        .eq('workspace_id', workspaceId)
        .contains('platforms', [platform])
        .order('published_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data || []) as LibraryPost[]
    } catch (error) {
      console.error('Error filtering library by platform:', error)
      return []
    }
  }

  /**
   * Filter library by post type
   */
  static async getLibraryByPostType(
    workspaceId: string,
    postType: string,
    limit: number = 50
  ): Promise<LibraryPost[]> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('post_library')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('post_type', postType)
        .order('published_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data || []) as LibraryPost[]
    } catch (error) {
      console.error('Error filtering library by post type:', error)
      return []
    }
  }

  /**
   * Get library posts by date range
   */
  static async getLibraryByDateRange(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LibraryPost[]> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('post_library')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('published_at', startDate.toISOString())
        .lte('published_at', endDate.toISOString())
        .order('published_at', { ascending: false })

      if (error) throw error
      return (data || []) as LibraryPost[]
    } catch (error) {
      console.error('Error filtering library by date range:', error)
      return []
    }
  }

  /**
   * Update post metrics (e.g., likes, comments, views)
   */
  static async updateMetrics(
    id: string,
    workspaceId: string,
    metrics: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = await createServerClient()
      const { error } = await (supabase
        .from('post_library') as any)
        .update({
          metrics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating metrics:', error)
      throw error
    }
  }

  /**
   * Delete post from library (permanent)
   */
  static async deleteFromLibrary(id: string, workspaceId: string): Promise<void> {
    try {
      const supabase = await createServerClient()
      const { error } = await supabase
        .from('post_library')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting from library:', error)
      throw error
    }
  }

  /**
   * Get library statistics
   */
  static async getLibraryStats(workspaceId: string): Promise<{
    totalPosts: number
    byPlatform: Record<string, number>
    byPostType: Record<string, number>
    lastPublished?: string
  }> {
    try {
      const supabase = await createServerClient()

      // Get all library posts for analysis
      const { data, error } = await (supabase
        .from('post_library') as any)
        .select('*')
        .eq('workspace_id', workspaceId)

      if (error) throw error

      const posts = (data || []) as LibraryPost[]
      const byPlatform: Record<string, number> = {}
      const byPostType: Record<string, number> = {}

      posts.forEach((post) => {
        // Count by platform
        (post.platforms || []).forEach((platform: string) => {
          byPlatform[platform] = (byPlatform[platform] || 0) + 1
        })

        // Count by post type
        const type = post.post_type || 'post'
        byPostType[type] = (byPostType[type] || 0) + 1
      })

      return {
        totalPosts: posts.length,
        byPlatform,
        byPostType,
        lastPublished: posts[0]?.published_at,
      }
    } catch (error) {
      console.error('Error getting library stats:', error)
      return {
        totalPosts: 0,
        byPlatform: {},
        byPostType: {},
      }
    }
  }
}
