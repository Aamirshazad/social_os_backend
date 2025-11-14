/**
 * DATA TRANSFER OBJECTS (DTOs)
 * Defines the shape of data transferred between layers
 * Helps maintain separation of concerns
 */

// ============================================================================
// WORKSPACE DTOs
// ============================================================================

export interface WorkspaceDTO {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  max_users: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateWorkspaceDTO {
  name: string
  description?: string
  logo_url?: string
  max_users?: number
}

export interface UpdateWorkspaceDTO {
  name?: string
  description?: string
  logo_url?: string
  max_users?: number
  is_active?: boolean
}

// ============================================================================
// USER DTOs
// ============================================================================

export interface UserDTO {
  id: string
  workspace_id: string
  email: string
  full_name: string | null
  role: 'admin' | 'editor' | 'viewer'
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserPublicDTO {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'editor' | 'viewer'
}

export interface CreateUserDTO {
  email: string
  full_name?: string
  role?: 'admin' | 'editor' | 'viewer'
  avatar_url?: string
  phone?: string
}

export interface UpdateUserDTO {
  full_name?: string
  avatar_url?: string
  phone?: string
  is_active?: boolean
}

export interface UpdateUserRoleDTO {
  role: 'admin' | 'editor' | 'viewer'
}

// ============================================================================
// SOCIAL ACCOUNT DTOs
// ============================================================================

export interface SocialAccountDTO {
  id: string
  workspace_id: string
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube'
  username: string | null
  account_id: string | null
  account_name: string | null
  profile_picture_url: string | null
  is_connected: boolean
  is_verified: boolean
  connected_at: string | null
  last_verified_at: string | null
  access_token_expires_at: string | null
  platform_user_id: string | null
  page_id: string | null
  created_at: string
  updated_at: string
}

export interface SocialAccountPublicDTO {
  id: string
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube'
  username: string | null
  account_name: string | null
  is_connected: boolean
  is_verified: boolean
}

// ============================================================================
// CAMPAIGN DTOs
// ============================================================================

export interface CampaignDTO {
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
  target_audience: Record<string, any>
  performance_targets: Record<string, any>
  budget_hours: number
  tags: string[] | null
  assigned_to: string[] | null
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CampaignWithAnalyticsDTO extends CampaignDTO {
  total_posts: number
  published_posts: number
  total_impressions: number
  total_engagement: number
  average_engagement_rate: number
}

export interface CreateCampaignDTO {
  name: string
  description?: string
  goal?: string
  color?: string
  start_date?: string
  end_date?: string
  content_themes?: string[]
  target_audience?: Record<string, any>
  performance_targets?: Record<string, any>
  budget_hours?: number
  tags?: string[]
  assigned_to?: string[]
}

export interface UpdateCampaignDTO {
  name?: string
  description?: string
  goal?: string
  status?: string
  color?: string
  start_date?: string
  end_date?: string
  content_themes?: string[]
  target_audience?: Record<string, any>
  performance_targets?: Record<string, any>
  budget_hours?: number
  tags?: string[]
  assigned_to?: string[]
  is_archived?: boolean
}

// ============================================================================
// POST DTOs
// ============================================================================

export interface PostDTO {
  id: string
  workspace_id: string
  campaign_id: string | null
  title: string | null
  topic: string | null
  status: 'draft' | 'needs_approval' | 'approved' | 'scheduled' | 'published' | 'failed'
  scheduled_at: string | null
  published_at: string | null
  engagement_score: number
  engagement_suggestions: string[] | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface PostWithContentDTO extends PostDTO {
  content: PostContentDTO
  platforms: string[]
  media: MediaAssetDTO[]
  approval?: ApprovalDTO
}

export interface PostContentDTO {
  text_content: string | null
  description: string | null
  hashtags: string[]
  mentions: string[]
  call_to_action: string | null
}

export interface CreatePostDTO {
  title?: string
  topic?: string
  campaign_id?: string
  content: PostContentDTO
  platforms: string[]
  scheduled_at?: string
  status?: 'draft' | 'needs_approval' | 'approved' | 'scheduled'
}

export interface UpdatePostDTO {
  title?: string
  topic?: string
  campaign_id?: string
  content?: PostContentDTO
  platforms?: string[]
  scheduled_at?: string
  status?: 'draft' | 'needs_approval' | 'approved' | 'scheduled' | 'published' | 'failed'
}

// ============================================================================
// MEDIA ASSET DTOs
// ============================================================================

export interface MediaAssetDTO {
  id: string
  workspace_id: string
  name: string
  description: string | null
  type: 'image' | 'video'
  source: 'uploaded' | 'ai-generated'
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
}

export interface CreateMediaAssetDTO {
  name: string
  description?: string
  type: 'image' | 'video'
  source: 'uploaded' | 'ai-generated'
  file_url: string
  thumbnail_url?: string
  file_size?: number
  width?: number
  height?: number
  duration_seconds?: number
  tags?: string[]
  alt_text?: string
}

export interface UpdateMediaAssetDTO {
  name?: string
  description?: string
  tags?: string[]
  alt_text?: string
}

// ============================================================================
// POST-MEDIA RELATIONSHIP DTOs
// ============================================================================

export interface PostMediaDTO {
  id: string
  post_id: string
  media_asset_id: string
  position_order: number
  usage_caption: string | null
  created_at: string
}

// ============================================================================
// APPROVAL DTOs
// ============================================================================

export interface ApprovalDTO {
  id: string
  post_id: string
  workspace_id: string
  requested_by: string
  approved_by: string | null
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalWithUserDTO extends ApprovalDTO {
  requested_by_user: UserPublicDTO
  approved_by_user: UserPublicDTO | null
}

export interface RequestApprovalDTO {
  post_id: string
}

export interface ApprovePostDTO {
  comment?: string
}

export interface RejectPostDTO {
  comment: string
}

// ============================================================================
// POST ANALYTICS DTOs
// ============================================================================

export interface PostAnalyticsDTO {
  id: string
  post_id: string
  platform: string
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
}

export interface PostAnalyticsSummaryDTO {
  total_impressions: number
  total_engagement: number
  average_engagement_rate: number
  platform_breakdown: Record<string, PostAnalyticsDTO[]>
}

// ============================================================================
// A/B TEST DTOs
// ============================================================================

export interface ABTestDTO {
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

export interface ABTestVariantDTO {
  id: string
  test_id: string
  post_id: string
  variant_name: string | null
  variant_number: number | null
  description: string | null
  created_at: string
}

export interface CreateABTestDTO {
  name: string
  description?: string
  campaign_id?: string
  test_type?: string
  hypothesis?: string
  start_date?: string
  end_date?: string
}

// ============================================================================
// ACTIVITY LOG DTOs
// ============================================================================

export interface ActivityLogDTO {
  id: string
  workspace_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface CreateActivityLogDTO {
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

// ============================================================================
// WORKSPACE INVITE DTOs
// ============================================================================

export interface WorkspaceInviteDTO {
  id: string
  workspace_id: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  is_accepted: boolean
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface CreateWorkspaceInviteDTO {
  email: string
  role?: 'admin' | 'editor' | 'viewer'
}

export interface AcceptInviteDTO {
  token: string
}

// ============================================================================
// CONTEXT DTOs (Used in middleware/requests)
// ============================================================================

export interface RequestContext {
  userId: string
  userEmail: string
  workspaceId: string
  userRole: 'admin' | 'editor' | 'viewer'
  user: UserDTO
  workspace: WorkspaceDTO
  requestId: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export interface PaginationDTO {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface ListResultDTO<T> {
  data: T[]
  pagination: PaginationDTO
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface SuccessResponseDTO<T> {
  success: true
  data: T
  message?: string
}

export interface ErrorResponseDTO {
  success: false
  error: string
  code: string
  details?: Record<string, any>
}

export type ApiResponseDTO<T> = SuccessResponseDTO<T> | ErrorResponseDTO
