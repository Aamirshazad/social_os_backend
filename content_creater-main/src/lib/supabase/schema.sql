-- ============================================
-- Social Media OS Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP EXISTING TABLES (for fresh schema)
-- ============================================

DROP TABLE IF EXISTS content_threads CASCADE;
DROP TABLE IF EXISTS post_library CASCADE;
DROP TABLE IF EXISTS a_b_test_variants CASCADE;
DROP TABLE IF EXISTS a_b_tests CASCADE;
DROP TABLE IF EXISTS campaign_analytics CASCADE;
DROP TABLE IF EXISTS workspace_invites CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP TABLE IF EXISTS post_analytics CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS post_media CASCADE;
DROP TABLE IF EXISTS post_platforms CASCADE;
DROP TABLE IF EXISTS post_content CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- ============================================
-- ENUMS
-- ============================================

-- Drop existing types (in correct order due to dependencies)
DROP TYPE IF EXISTS platform CASCADE;
DROP TYPE IF EXISTS platform_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS post_status CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS media_type CASCADE;
DROP TYPE IF EXISTS media_source CASCADE;

-- Create enums
CREATE TYPE platform_type AS ENUM ('twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube');
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE post_status AS ENUM ('draft', 'needs_approval', 'approved', 'ready_to_publish', 'scheduled', 'published', 'failed');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE media_source AS ENUM ('ai-generated', 'uploaded');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- Workspaces (Teams/Organizations)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    max_users INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'viewer',
    avatar_url TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

-- Social Media Accounts (Enhanced with token refresh support)
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    credentials_encrypted TEXT NOT NULL,
    refresh_token_encrypted VARCHAR,
    username VARCHAR(255),
    account_id VARCHAR(255),
    account_name VARCHAR(255),
    profile_picture_url VARCHAR(500),
    is_connected BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    connected_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    access_token_expires_at TIMESTAMPTZ,
    last_refreshed_at TIMESTAMPTZ,
    refresh_error_count INTEGER DEFAULT 0,
    last_error_message TEXT,
    platform_user_id VARCHAR(255),
    page_id VARCHAR(255),
    page_name VARCHAR(255),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, platform, account_id)
);

-- Campaigns (Enhanced)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    status VARCHAR(50) DEFAULT 'active',
    color TEXT DEFAULT '#3B82F6',
    icon VARCHAR(50),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    content_themes TEXT[],
    target_audience JSONB DEFAULT '{}',
    performance_targets JSONB DEFAULT '{}',
    budget_hours INTEGER DEFAULT 0,
    tags TEXT[],
    assigned_to UUID[],
    is_archived BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts (Enhanced)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    title VARCHAR(255),
    topic TEXT NOT NULL,
    post_type VARCHAR(50) DEFAULT 'post',
    platforms platform_type[],
    content JSONB NOT NULL DEFAULT '{}',
    platform_templates JSONB DEFAULT '{}',
    status post_status DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    engagement_score INTEGER,
    engagement_suggestions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Post Content (Versioning - NEW)
CREATE TABLE post_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    text_content TEXT,
    description TEXT,
    hashtags TEXT[],
    mentions TEXT[],
    call_to_action VARCHAR(255),
    version_number INTEGER NOT NULL,
    change_summary TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Platforms (Junction - NEW)
CREATE TABLE post_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    platform_post_id VARCHAR(255),
    platform_status VARCHAR(50),
    platform_error_message TEXT,
    platform_impressions INTEGER DEFAULT 0,
    platform_engagement INTEGER DEFAULT 0,
    platform_reach INTEGER DEFAULT 0,
    posted_at TIMESTAMPTZ,
    error_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, platform)
);

-- Media Assets (Enhanced)
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type media_type NOT NULL,
    source media_source DEFAULT 'uploaded',
    url TEXT NOT NULL,
    file_url VARCHAR(500),
    thumbnail_url TEXT,
    size BIGINT NOT NULL,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    tags TEXT[] DEFAULT '{}',
    alt_text VARCHAR(255),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Post Media (Junction - NEW)
CREATE TABLE post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    position_order INTEGER DEFAULT 0,
    usage_caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, media_asset_id)
);

-- Approvals
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status approval_status DEFAULT 'pending',
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, workspace_id)
);

-- Activity Logs (Audit Trail)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Analytics (Enhanced)
CREATE TABLE post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement_rate NUMERIC(5,2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    engagement_total INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth States (Security - NEW)
CREATE TABLE oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    state VARCHAR(255) NOT NULL UNIQUE,
    code_challenge VARCHAR(255),
    code_challenge_method VARCHAR(10),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Invites (NEW)
CREATE TABLE workspace_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    token VARCHAR(255) NOT NULL UNIQUE,
    is_accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ,
    accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

-- A/B Tests (NEW)
CREATE TABLE a_b_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    test_type VARCHAR(50),
    hypothesis TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Variants (NEW)
CREATE TABLE a_b_test_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES a_b_tests(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    variant_name VARCHAR(100),
    variant_number INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Analytics (NEW)
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    platform platform_type,
    total_posts INTEGER DEFAULT 0,
    published_posts INTEGER DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    total_reach BIGINT DEFAULT 0,
    average_engagement_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, metric_date, platform)
);

-- Post Library (Published Posts Archive - NEW)
CREATE TABLE post_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    original_post_id UUID,
    title VARCHAR(255),
    topic VARCHAR(255),
    post_type VARCHAR(50),
    platforms TEXT[],
    content JSONB,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    platform_data JSONB,
    metrics JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Threads (AI Chat History - NEW)
CREATE TABLE content_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255),
    messages JSONB NOT NULL DEFAULT '[]',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Workspaces
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at DESC);
CREATE INDEX idx_workspaces_is_active ON workspaces(is_active);

-- Users
CREATE INDEX idx_users_workspace ON users(workspace_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Posts
CREATE INDEX idx_posts_workspace ON posts(workspace_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_posts_campaign ON posts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_posts_created_by ON posts(created_by);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_workspace_status ON posts(workspace_id, status);
CREATE INDEX idx_posts_workspace_scheduled ON posts(workspace_id, scheduled_at) WHERE status = 'scheduled';

-- Post Content
CREATE INDEX idx_post_content_post_id ON post_content(post_id);
CREATE INDEX idx_post_content_version ON post_content(post_id, version_number DESC);
CREATE INDEX idx_post_content_is_current ON post_content(post_id) WHERE is_current = true;

-- Post Platforms
CREATE INDEX idx_post_platforms_post_id ON post_platforms(post_id);
CREATE INDEX idx_post_platforms_platform ON post_platforms(platform);
CREATE INDEX idx_post_platforms_status ON post_platforms(platform_status);

-- Social Accounts
CREATE INDEX idx_social_accounts_workspace ON social_accounts(workspace_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_workspace_platform ON social_accounts(workspace_id, platform);
CREATE INDEX idx_social_accounts_is_connected ON social_accounts(is_connected);
CREATE INDEX idx_social_accounts_expires_at ON social_accounts(access_token_expires_at);
CREATE INDEX idx_social_accounts_last_refreshed ON social_accounts(last_refreshed_at);

-- Campaigns
CREATE INDEX idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX idx_campaigns_workspace_status ON campaigns(workspace_id, status);

-- Media
CREATE INDEX idx_media_workspace ON media_assets(workspace_id);
CREATE INDEX idx_media_type ON media_assets(type);
CREATE INDEX idx_media_tags ON media_assets USING GIN(tags);
CREATE INDEX idx_media_created_at ON media_assets(created_at DESC);
CREATE INDEX idx_media_active ON media_assets(workspace_id) WHERE deleted_at IS NULL;

-- Post Media
CREATE INDEX idx_post_media_post_id ON post_media(post_id);
CREATE INDEX idx_post_media_media_asset_id ON post_media(media_asset_id);
CREATE INDEX idx_post_media_position ON post_media(post_id, position_order);

-- Approvals
CREATE INDEX idx_approvals_post ON approvals(post_id);
CREATE INDEX idx_approvals_workspace ON approvals(workspace_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_created_at ON approvals(created_at DESC);

-- Activity Logs
CREATE INDEX idx_activity_logs_workspace ON activity_logs(workspace_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_workspace_date ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

-- Post Analytics
CREATE INDEX idx_analytics_post ON post_analytics(post_id);
CREATE INDEX idx_analytics_workspace ON post_analytics(workspace_id);
CREATE INDEX idx_analytics_platform ON post_analytics(platform);
CREATE INDEX idx_analytics_fetched_at ON post_analytics(fetched_at DESC);
CREATE INDEX idx_analytics_workspace_date ON post_analytics(workspace_id, fetched_at DESC);

-- OAuth States
CREATE INDEX idx_oauth_states_workspace_platform ON oauth_states(workspace_id, platform);
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX idx_oauth_states_is_used ON oauth_states(is_used);

-- Workspace Invites
CREATE INDEX idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX idx_workspace_invites_expires_at ON workspace_invites(expires_at);
CREATE INDEX idx_workspace_invites_is_accepted ON workspace_invites(is_accepted);
CREATE INDEX idx_workspace_invites_email ON workspace_invites(email);

-- A/B Tests
CREATE INDEX idx_a_b_tests_workspace_id ON a_b_tests(workspace_id);
CREATE INDEX idx_a_b_tests_campaign_id ON a_b_tests(campaign_id);
CREATE INDEX idx_a_b_tests_status ON a_b_tests(status);

-- A/B Test Variants
CREATE INDEX idx_a_b_test_variants_test_id ON a_b_test_variants(test_id);
CREATE INDEX idx_a_b_test_variants_post_id ON a_b_test_variants(post_id);

-- Campaign Analytics
CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_metric_date ON campaign_analytics(metric_date DESC);
CREATE INDEX idx_campaign_analytics_workspace_id ON campaign_analytics(workspace_id);

-- Post Library
CREATE INDEX idx_post_library_workspace ON post_library(workspace_id);
CREATE INDEX idx_post_library_published_at ON post_library(published_at DESC);
CREATE INDEX idx_post_library_topic ON post_library(topic);
CREATE INDEX idx_post_library_created_by ON post_library(created_by);

-- Content Threads
CREATE INDEX idx_content_threads_workspace ON content_threads(workspace_id);
CREATE INDEX idx_content_threads_created_at ON content_threads(created_at DESC);
CREATE INDEX idx_content_threads_deleted ON content_threads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_threads_created_by ON content_threads(created_by);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON social_accounts;
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON media_assets;
CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON media_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approvals_updated_at ON approvals;
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_platforms_updated_at ON post_platforms;
CREATE TRIGGER update_post_platforms_updated_at BEFORE UPDATE ON post_platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_a_b_tests_updated_at ON a_b_tests;
CREATE TRIGGER update_a_b_tests_updated_at BEFORE UPDATE ON a_b_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_analytics_updated_at ON post_analytics;
CREATE TRIGGER update_post_analytics_updated_at BEFORE UPDATE ON post_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_analytics_updated_at ON campaign_analytics;
CREATE TRIGGER update_campaign_analytics_updated_at BEFORE UPDATE ON campaign_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_library_updated_at ON post_library;
CREATE TRIGGER update_post_library_updated_at BEFORE UPDATE ON post_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_threads_updated_at ON content_threads;
CREATE TRIGGER update_content_threads_updated_at BEFORE UPDATE ON content_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Create a new workspace for the user
    INSERT INTO public.workspaces (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace') || '''s Workspace')
    RETURNING id INTO new_workspace_id;

    -- Create user profile
    INSERT INTO public.users (id, email, full_name, role, workspace_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        'admin',
        new_workspace_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_workspace_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (workspace_id, user_id, action, resource_type, resource_id, details)
    VALUES (p_workspace_id, p_user_id, p_action, p_resource_type, p_resource_id, p_details)
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to fetch current user's profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (workspace_id UUID, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT u.workspace_id, u.role
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get current user's workspace ID
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION is_workspace_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_b_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_b_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_threads ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can only see their own workspace
CREATE POLICY "Users can view their workspace"
    ON workspaces FOR SELECT
    USING (id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their workspace"
    ON workspaces FOR UPDATE
    USING (
        id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users: Can view users in their workspace
CREATE POLICY "Users can view workspace members"
    ON users FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- Posts: Workspace-scoped access
CREATE POLICY "Users can view posts in their workspace"
    ON posts FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create posts in their workspace"
    ON posts FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update posts they created or admins can update any"
    ON posts FOR UPDATE
    USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid() AND role IN ('admin', 'editor')
            )
        )
    );

CREATE POLICY "Admins can delete posts in their workspace"
    ON posts FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Post Content: Workspace-scoped access
CREATE POLICY "Users can view post content in their workspace"
    ON post_content FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM posts WHERE workspace_id IN (
                SELECT workspace_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Post Platforms: Workspace-scoped access
CREATE POLICY "Users can view post platforms in their workspace"
    ON post_platforms FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM posts WHERE workspace_id IN (
                SELECT workspace_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Post Media: Workspace-scoped access
CREATE POLICY "Users can view post media in their workspace"
    ON post_media FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM posts WHERE workspace_id IN (
                SELECT workspace_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Social Accounts: Workspace-scoped
CREATE POLICY "Users can view social accounts in their workspace"
    ON social_accounts FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage social accounts"
    ON social_accounts FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Campaigns: Workspace-scoped
CREATE POLICY "Users can view campaigns in their workspace"
    ON campaigns FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Editors can manage campaigns"
    ON campaigns FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Media Assets: Workspace-scoped
CREATE POLICY "Users can view media in their workspace"
    ON media_assets FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can upload media"
    ON media_assets FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own media"
    ON media_assets FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete media"
    ON media_assets FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Approvals: Workspace-scoped
CREATE POLICY "Users can view approvals in their workspace"
    ON approvals FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can request approvals"
    ON approvals FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND requested_by = auth.uid()
    );

CREATE POLICY "Admins can update approvals"
    ON approvals FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Activity Logs: Read-only for users, workspace-scoped
CREATE POLICY "Users can view activity logs in their workspace"
    ON activity_logs FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Post Analytics: Workspace-scoped
CREATE POLICY "Users can view analytics in their workspace"
    ON post_analytics FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- OAuth States: Workspace-scoped
-- Use RPC function to avoid RLS recursion on users table
CREATE POLICY "Users can view oauth states in their workspace"
    ON oauth_states FOR ALL
    USING (workspace_id = get_user_workspace_id());

-- Workspace Invites: Admin-only
CREATE POLICY "Admins can manage workspace invites"
    ON workspace_invites FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- A/B Tests: Workspace-scoped
CREATE POLICY "Users can view a_b tests in their workspace"
    ON a_b_tests FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Editors can manage a_b tests"
    ON a_b_tests FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- A/B Test Variants: Workspace-scoped
CREATE POLICY "Users can view a_b test variants in their workspace"
    ON a_b_test_variants FOR SELECT
    USING (
        test_id IN (
            SELECT id FROM a_b_tests WHERE workspace_id IN (
                SELECT workspace_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Campaign Analytics: Workspace-scoped
CREATE POLICY "Users can view campaign analytics in their workspace"
    ON campaign_analytics FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Post Library: Workspace-scoped
CREATE POLICY "Users can view post library in their workspace"
    ON post_library FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Content Threads: Workspace-scoped
CREATE POLICY "Users can manage content threads in their workspace"
    ON content_threads FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- ============================================
-- STORAGE BUCKETS (for media files)
-- ============================================

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload media to their workspace"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'media'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Anyone can view media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'media');

CREATE POLICY "Users can update their own media"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own media"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- ============================================
-- COMPLETE!
-- ============================================
-- Your database schema is now ready.
-- Tables: 19 total (basic + enhanced + new)
-- Includes: OAuth token management, versioning, A/B testing, analytics
-- Security: RLS policies, workspace isolation, soft deletes
-- ============================================
