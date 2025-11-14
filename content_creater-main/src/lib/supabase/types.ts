/**
 * ENTERPRISE-READY DATABASE TYPES
 * Generated from the new normalized schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'editor' | 'viewer'
export type PlatformType = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube'
export type PostStatus = 'draft' | 'needs_approval' | 'approved' | 'scheduled' | 'published' | 'failed'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type MediaType = 'image' | 'video'
export type MediaSource = 'uploaded' | 'ai-generated'

export interface Database {
  public: {
    Tables: {
      // ========================================
      // CORE TABLES
      // ========================================

      workspaces: {
        Row: {
          id: string
          name: string
          description: string | null
          logo_url: string | null
          max_users: number
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          logo_url?: string | null
          max_users?: number
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          max_users?: number
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      users: {
        Row: {
          id: string
          workspace_id: string
          email: string
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          phone: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          workspace_id: string
          email: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      social_accounts: {
        Row: {
          id: string
          workspace_id: string
          platform: PlatformType
          credentials_encrypted: string
          refresh_token_encrypted: string | null
          username: string | null
          account_id: string | null
          account_name: string | null
          profile_picture_url: string | null
          is_connected: boolean
          is_verified: boolean
          connected_at: string | null
          last_verified_at: string | null
          access_token_expires_at: string | null
          last_refreshed_at: string | null
          refresh_error_count: number
          last_error_message: string | null
          platform_user_id: string | null
          page_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: PlatformType
          credentials_encrypted: string
          refresh_token_encrypted?: string | null
          username?: string | null
          account_id?: string | null
          account_name?: string | null
          profile_picture_url?: string | null
          is_connected?: boolean
          is_verified?: boolean
          connected_at?: string | null
          last_verified_at?: string | null
          access_token_expires_at?: string | null
          last_refreshed_at?: string | null
          refresh_error_count?: number
          last_error_message?: string | null
          platform_user_id?: string | null
          page_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          platform?: PlatformType
          credentials_encrypted?: string
          refresh_token_encrypted?: string | null
          username?: string | null
          account_id?: string | null
          account_name?: string | null
          profile_picture_url?: string | null
          is_connected?: boolean
          is_verified?: boolean
          connected_at?: string | null
          last_verified_at?: string | null
          access_token_expires_at?: string | null
          last_refreshed_at?: string | null
          refresh_error_count?: number
          last_error_message?: string | null
          platform_user_id?: string | null
          page_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      campaigns: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          goal: string | null
          status: string
          start_date: string | null
          end_date: string | null
          color: string | null
          icon: string | null
          content_themes: string[] | null
          target_audience: Json
          performance_targets: Json
          budget_hours: number
          tags: string[] | null
          assigned_to: string[] | null
          is_archived: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          goal?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          color?: string | null
          icon?: string | null
          content_themes?: string[] | null
          target_audience?: Json
          performance_targets?: Json
          budget_hours?: number
          tags?: string[] | null
          assigned_to?: string[] | null
          is_archived?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          goal?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          color?: string | null
          icon?: string | null
          content_themes?: string[] | null
          target_audience?: Json
          performance_targets?: Json
          budget_hours?: number
          tags?: string[] | null
          assigned_to?: string[] | null
          is_archived?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      posts: {
        Row: {
          id: string
          workspace_id: string
          campaign_id: string | null
          title: string | null
          topic: string | null
          status: PostStatus
          scheduled_at: string | null
          published_at: string | null
          engagement_score: number
          engagement_suggestions: string[] | null
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          campaign_id?: string | null
          title?: string | null
          topic?: string | null
          status?: PostStatus
          scheduled_at?: string | null
          published_at?: string | null
          engagement_score?: number
          engagement_suggestions?: string[] | null
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          campaign_id?: string | null
          title?: string | null
          topic?: string | null
          status?: PostStatus
          scheduled_at?: string | null
          published_at?: string | null
          engagement_score?: number
          engagement_suggestions?: string[] | null
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      post_content: {
        Row: {
          id: string
          post_id: string
          text_content: string | null
          description: string | null
          hashtags: string[] | null
          mentions: string[] | null
          call_to_action: string | null
          version_number: number
          change_summary: string | null
          changed_by: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          text_content?: string | null
          description?: string | null
          hashtags?: string[] | null
          mentions?: string[] | null
          call_to_action?: string | null
          version_number: number
          change_summary?: string | null
          changed_by?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          text_content?: string | null
          description?: string | null
          hashtags?: string[] | null
          mentions?: string[] | null
          call_to_action?: string | null
          version_number?: number
          change_summary?: string | null
          changed_by?: string | null
          is_current?: boolean
          created_at?: string
        }
      }

      post_platforms: {
        Row: {
          id: string
          post_id: string
          platform: PlatformType
          platform_post_id: string | null
          platform_status: string | null
          platform_error_message: string | null
          platform_impressions: number
          platform_engagement: number
          platform_reach: number
          posted_at: string | null
          error_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          platform: PlatformType
          platform_post_id?: string | null
          platform_status?: string | null
          platform_error_message?: string | null
          platform_impressions?: number
          platform_engagement?: number
          platform_reach?: number
          posted_at?: string | null
          error_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          platform?: PlatformType
          platform_post_id?: string | null
          platform_status?: string | null
          platform_error_message?: string | null
          platform_impressions?: number
          platform_engagement?: number
          platform_reach?: number
          posted_at?: string | null
          error_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      media_assets: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          type: MediaType
          source: MediaSource
          file_url: string
          thumbnail_url: string | null
          file_size: number | null
          width: number | null
          height: number | null
          duration_seconds: number | null
          tags: string[] | null
          alt_text: string | null
          usage_count: number
          last_used_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          type: MediaType
          source: MediaSource
          file_url: string
          thumbnail_url?: string | null
          file_size?: number | null
          width?: number | null
          height?: number | null
          duration_seconds?: number | null
          tags?: string[] | null
          alt_text?: string | null
          usage_count?: number
          last_used_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          type?: MediaType
          source?: MediaSource
          file_url?: string
          thumbnail_url?: string | null
          file_size?: number | null
          width?: number | null
          height?: number | null
          duration_seconds?: number | null
          tags?: string[] | null
          alt_text?: string | null
          usage_count?: number
          last_used_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      post_media: {
        Row: {
          id: string
          post_id: string
          media_asset_id: string
          position_order: number
          usage_caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          media_asset_id: string
          position_order?: number
          usage_caption?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          media_asset_id?: string
          position_order?: number
          usage_caption?: string | null
          created_at?: string
        }
      }

      approvals: {
        Row: {
          id: string
          post_id: string
          workspace_id: string
          requested_by: string
          approved_by: string | null
          status: ApprovalStatus
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          workspace_id: string
          requested_by: string
          approved_by?: string | null
          status?: ApprovalStatus
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          workspace_id?: string
          requested_by?: string
          approved_by?: string | null
          status?: ApprovalStatus
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      post_analytics: {
        Row: {
          id: string
          post_id: string
          workspace_id: string
          platform: PlatformType
          impressions: number
          reach: number
          engagement_rate: number
          clicks: number
          shares: number
          comments: number
          likes: number
          reposts: number
          replies: number
          saves: number
          engagement_total: number
          fetched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          workspace_id: string
          platform: PlatformType
          impressions?: number
          reach?: number
          engagement_rate?: number
          clicks?: number
          shares?: number
          comments?: number
          likes?: number
          reposts?: number
          replies?: number
          saves?: number
          engagement_total?: number
          fetched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          workspace_id?: string
          platform?: PlatformType
          impressions?: number
          reach?: number
          engagement_rate?: number
          clicks?: number
          shares?: number
          comments?: number
          likes?: number
          reposts?: number
          replies?: number
          saves?: number
          engagement_total?: number
          fetched_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      activity_logs: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }

      oauth_states: {
        Row: {
          id: string
          workspace_id: string
          platform: PlatformType
          state: string
          code_challenge: string | null
          code_challenge_method: string | null
          ip_address: string | null
          user_agent: string | null
          is_used: boolean
          used_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: PlatformType
          state: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          ip_address?: string | null
          user_agent?: string | null
          is_used?: boolean
          used_at?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          platform?: PlatformType
          state?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          ip_address?: string | null
          user_agent?: string | null
          is_used?: boolean
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }

      workspace_invites: {
        Row: {
          id: string
          workspace_id: string
          email: string
          invited_by: string
          role: UserRole
          token: string
          is_accepted: boolean
          accepted_at: string | null
          accepted_by_user_id: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          invited_by: string
          role?: UserRole
          token: string
          is_accepted?: boolean
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          invited_by?: string
          role?: UserRole
          token?: string
          is_accepted?: boolean
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          expires_at?: string
          created_at?: string
        }
      }

      a_b_tests: {
        Row: {
          id: string
          workspace_id: string
          campaign_id: string | null
          name: string
          description: string | null
          status: string
          test_type: string | null
          hypothesis: string | null
          start_date: string | null
          end_date: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          campaign_id?: string | null
          name: string
          description?: string | null
          status?: string
          test_type?: string | null
          hypothesis?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          campaign_id?: string | null
          name?: string
          description?: string | null
          status?: string
          test_type?: string | null
          hypothesis?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      a_b_test_variants: {
        Row: {
          id: string
          test_id: string
          post_id: string
          variant_name: string | null
          variant_number: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          test_id: string
          post_id: string
          variant_name?: string | null
          variant_number?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          test_id?: string
          post_id?: string
          variant_name?: string | null
          variant_number?: number | null
          description?: string | null
          created_at?: string
        }
      }

      campaign_analytics: {
        Row: {
          id: string
          campaign_id: string
          workspace_id: string
          metric_date: string
          platform: PlatformType | null
          total_posts: number
          published_posts: number
          total_impressions: number
          total_engagement: number
          total_reach: number
          average_engagement_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          workspace_id: string
          metric_date: string
          platform?: PlatformType | null
          total_posts?: number
          published_posts?: number
          total_impressions?: number
          total_engagement?: number
          total_reach?: number
          average_engagement_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          workspace_id?: string
          metric_date?: string
          platform?: PlatformType | null
          total_posts?: number
          published_posts?: number
          total_impressions?: number
          total_engagement?: number
          total_reach?: number
          average_engagement_rate?: number
          created_at?: string
          updated_at?: string
        }
      }

      post_library: {
        Row: {
          id: string
          workspace_id: string
          original_post_id: string | null
          title: string | null
          topic: string
          post_type: string
          platforms: string[]
          content: Json
          published_at: string
          platform_data: Json
          metrics: Json | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          original_post_id?: string | null
          title?: string | null
          topic: string
          post_type: string
          platforms: string[]
          content: Json
          published_at: string
          platform_data: Json
          metrics?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          original_post_id?: string | null
          title?: string | null
          topic?: string
          post_type?: string
          platforms?: string[]
          content?: Json
          published_at?: string
          platform_data?: Json
          metrics?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      content_threads: {
        Row: {
          id: string
          workspace_id: string
          title: string
          messages: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          messages: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          messages?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      audit_logs: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          changes: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          changes?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          changes?: Json | null
          created_at?: string
        }
      }

      credential_audit_log: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          action: string
          credential_type: string
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          action: string
          credential_type: string
          status: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          action?: string
          credential_type?: string
          status?: string
          error_message?: string | null
          created_at?: string
        }
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      get_user_workspace_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_workspace_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_post_with_platforms: {
        Args: {
          post_id: string
        }
        Returns: {
          id: string
          workspace_id: string
          title: string | null
          status: string
          platforms: string | null
          scheduled_at: string | null
        }[]
      }
    }

    Enums: {
      user_role: UserRole
      platform_type: PlatformType
      post_status: PostStatus
      approval_status: ApprovalStatus
      media_type: MediaType
      media_source: MediaSource
    }
  }
}
