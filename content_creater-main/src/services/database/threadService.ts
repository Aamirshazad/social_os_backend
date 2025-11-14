/**
 * Thread Service
 * Manages Content Strategist conversation threads
 * Stores chat history in database with full CRUD operations
 */

import { createServerClient } from '@/lib/supabase/server'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ContentThread {
  id: string
  workspace_id: string
  title: string
  messages: ChatMessage[]
  created_by: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export class ThreadService {
  /**
   * Create a new conversation thread
   */
  static async createThread(
    title: string,
    workspaceId: string,
    userId: string
  ): Promise<ContentThread> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .insert({
          id: crypto.randomUUID(),
          workspace_id: workspaceId,
          title,
          messages: [],
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      return data as ContentThread
    } catch (error) {
      console.error('Error creating thread:', error)
      throw error
    }
  }

  /**
   * Get all active threads in a workspace
   */
  static async getAllThreads(
    workspaceId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ items: ContentThread[]; total: number }> {
    try {
      const supabase = await createServerClient()

      // Get total count
      const { count } = await (supabase
        .from('content_threads') as any)
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)

      // Get paginated results
      const { data, error } = await (supabase
        .from('content_threads') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        items: (data || []) as ContentThread[],
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching threads:', error)
      return { items: [], total: 0 }
    }
  }

  /**
   * Get thread by ID
   */
  static async getThreadById(
    id: string,
    workspaceId: string
  ): Promise<ContentThread | null> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .single()

      if (error) throw error

      return (data as ContentThread) || null
    } catch (error) {
      console.error('Error fetching thread by ID:', error)
      return null
    }
  }

  /**
   * Search threads by title
   */
  static async searchThreads(
    workspaceId: string,
    query: string,
    limit: number = 50
  ): Promise<ContentThread[]> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as ContentThread[]
    } catch (error) {
      console.error('Error searching threads:', error)
      return []
    }
  }

  /**
   * Update thread title
   */
  static async updateThreadTitle(
    id: string,
    workspaceId: string,
    title: string
  ): Promise<void> {
    try {
      const supabase = await createServerClient()

      const { error } = await (supabase
        .from('content_threads') as any)
        .update({
          title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating thread title:', error)
      throw error
    }
  }

  /**
   * Add message to thread
   */
  static async addMessage(
    threadId: string,
    workspaceId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      const supabase = await createServerClient()

      // Get current thread to access messages array
      const thread = await this.getThreadById(threadId, workspaceId)
      if (!thread) throw new Error('Thread not found')

      // Add new message to array
      const updatedMessages = [...(thread.messages || []), message]

      const { error } = await (supabase
        .from('content_threads') as any)
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', threadId)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error adding message:', error)
      throw error
    }
  }

  /**
   * Update entire messages array for a thread
   */
  static async updateMessages(
    threadId: string,
    workspaceId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      const supabase = await createServerClient()

      const { error } = await (supabase
        .from('content_threads') as any)
        .update({
          messages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', threadId)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating messages:', error)
      throw error
    }
  }

  /**
   * Soft delete thread
   */
  static async deleteThread(id: string, workspaceId: string): Promise<void> {
    try {
      const supabase = await createServerClient()

      const { error } = await (supabase
        .from('content_threads') as any)
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting thread:', error)
      throw error
    }
  }

  /**
   * Restore a deleted thread
   */
  static async restoreThread(id: string, workspaceId: string): Promise<void> {
    try {
      const supabase = await createServerClient()

      const { error } = await (supabase
        .from('content_threads') as any)
        .update({
          deleted_at: null,
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      console.error('Error restoring thread:', error)
      throw error
    }
  }

  /**
   * Get recently used threads
   */
  static async getRecentThreads(
    workspaceId: string,
    limit: number = 10
  ): Promise<ContentThread[]> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as ContentThread[]
    } catch (error) {
      console.error('Error fetching recent threads:', error)
      return []
    }
  }

  /**
   * Get threads by user
   */
  static async getThreadsByUser(
    workspaceId: string,
    userId: string,
    limit: number = 50
  ): Promise<ContentThread[]> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('created_by', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as ContentThread[]
    } catch (error) {
      console.error('Error fetching threads by user:', error)
      return []
    }
  }

  /**
   * Get thread statistics
   */
  static async getThreadStats(workspaceId: string): Promise<{
    totalThreads: number
    totalMessages: number
    avgMessagesPerThread: number
    recentActivity: string | null
  }> {
    try {
      const supabase = await createServerClient()

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)

      if (error) throw error

      const threads = data || []
      let totalMessages = 0

      threads.forEach((thread: any) => {
        totalMessages += (thread.messages || []).length
      })

      const avgMessages = threads.length > 0 ? totalMessages / threads.length : 0

      return {
        totalThreads: threads.length,
        totalMessages,
        avgMessagesPerThread: Math.round(avgMessages * 100) / 100,
        recentActivity: threads[0]?.updated_at || null,
      }
    } catch (error) {
      console.error('Error getting thread stats:', error)
      return {
        totalThreads: 0,
        totalMessages: 0,
        avgMessagesPerThread: 0,
        recentActivity: null,
      }
    }
  }

  /**
   * Clear old threads (optional cleanup)
   */
  static async clearOldThreads(
    workspaceId: string,
    daysOld: number = 30
  ): Promise<number> {
    try {
      const supabase = await createServerClient()

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await (supabase
        .from('content_threads') as any)
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .lt('updated_at', cutoffDate.toISOString())

      if (error) throw error

      return data?.length || 0
    } catch (error) {
      console.error('Error clearing old threads:', error)
      return 0
    }
  }
}
