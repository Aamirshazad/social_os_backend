-- ============================================
-- Campaign System Enhancement Migration
-- Adds missing fields and tables for enterprise campaign management
-- ============================================

-- Add missing columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning',
ADD COLUMN IF NOT EXISTS campaign_type TEXT,
ADD COLUMN IF NOT EXISTS content_themes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS performance_targets JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS budget_hours INTEGER,
ADD COLUMN IF NOT EXISTS assigned_to UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Drop redundant column if exists
ALTER TABLE campaigns DROP COLUMN IF EXISTS goal;

-- Create campaign analytics table
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_posts INTEGER DEFAULT 0,
    published_posts INTEGER DEFAULT 0,
    total_reach INTEGER DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    follower_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    click_through_rate DECIMAL(5,2) DEFAULT 0,
    top_post_id UUID REFERENCES posts(id),
    platform_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

-- Create campaign templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    campaign_type TEXT,
    duration_days INTEGER,
    recommended_post_count INTEGER,
    content_themes TEXT[] DEFAULT '{}',
    goals TEXT[] DEFAULT '{}',
    template_data JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create A/B tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hypothesis TEXT,
    variation_type TEXT NOT NULL, -- 'caption' | 'image' | 'cta' | 'timing' | 'platform'
    control_post_id UUID REFERENCES posts(id),
    variant_post_ids UUID[] DEFAULT '{}',
    traffic_split JSONB DEFAULT '{}', -- { "control": 50, "variantA": 25, "variantB": 25 }
    status TEXT DEFAULT 'draft', -- 'draft' | 'running' | 'completed' | 'cancelled'
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    winner_post_id UUID REFERENCES posts(id),
    confidence_level DECIMAL(5,2),
    results JSONB DEFAULT '{}',
    insights TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign comments table for collaboration
CREATE TABLE IF NOT EXISTS campaign_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}', -- User IDs mentioned
    parent_comment_id UUID REFERENCES campaign_comments(id),
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign milestones table
CREATE TABLE IF NOT EXISTS campaign_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_archived ON campaigns(archived);
CREATE INDEX IF NOT EXISTS idx_posts_campaign_status ON posts(campaign_id, status) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_date ON campaign_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign ON ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);

CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign ON campaign_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_user ON campaign_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_milestones_campaign ON campaign_milestones(campaign_id);

-- Add RLS policies for new tables
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_milestones ENABLE ROW LEVEL SECURITY;

-- Campaign Analytics policies
CREATE POLICY "Users can view analytics in their workspace"
    ON campaign_analytics FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert analytics"
    ON campaign_analytics FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Campaign Templates policies
CREATE POLICY "Users can view templates in their workspace or public"
    ON campaign_templates FOR SELECT
    USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        OR is_public = true
    );

CREATE POLICY "Editors can manage templates"
    ON campaign_templates FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- A/B Tests policies
CREATE POLICY "Users can view tests in their workspace"
    ON ab_tests FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Editors can manage tests"
    ON ab_tests FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Campaign Comments policies
CREATE POLICY "Users can view comments in their workspace"
    ON campaign_comments FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create comments"
    ON campaign_comments FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own comments"
    ON campaign_comments FOR UPDATE
    USING (user_id = auth.uid());

-- Campaign Milestones policies
CREATE POLICY "Users can view milestones in their workspace"
    ON campaign_milestones FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Editors can manage milestones"
    ON campaign_milestones FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER update_campaign_analytics_updated_at BEFORE UPDATE ON campaign_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_templates_updated_at BEFORE UPDATE ON campaign_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_comments_updated_at BEFORE UPDATE ON campaign_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_milestones_updated_at BEFORE UPDATE ON campaign_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate campaign health score
CREATE OR REPLACE FUNCTION calculate_campaign_health(p_campaign_id UUID)
RETURNS INTEGER AS $$
DECLARE
    health_score INTEGER := 0;
    post_count INTEGER;
    scheduled_count INTEGER;
    days_until_end INTEGER;
    days_since_start INTEGER;
BEGIN
    -- Get campaign stats
    SELECT COUNT(*) INTO post_count
    FROM posts
    WHERE campaign_id = p_campaign_id;
    
    SELECT COUNT(*) INTO scheduled_count
    FROM posts
    WHERE campaign_id = p_campaign_id AND status = 'scheduled';
    
    -- Calculate days
    SELECT 
        EXTRACT(DAY FROM (end_date - NOW())),
        EXTRACT(DAY FROM (NOW() - start_date))
    INTO days_until_end, days_since_start
    FROM campaigns
    WHERE id = p_campaign_id;
    
    -- Score based on activity (0-100)
    health_score := LEAST(100, post_count * 5);
    
    -- Boost if posts are scheduled
    IF scheduled_count > 0 THEN
        health_score := health_score + 20;
    END IF;
    
    -- Penalize if campaign ending soon with no scheduled posts
    IF days_until_end < 7 AND scheduled_count = 0 THEN
        health_score := health_score - 30;
    END IF;
    
    RETURN GREATEST(0, LEAST(100, health_score));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration Complete
-- ============================================
