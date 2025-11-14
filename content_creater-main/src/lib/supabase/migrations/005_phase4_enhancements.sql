-- ============================================================================
-- PHASE 4: PRODUCTION TEMPLATES & LIBRARY ENHANCEMENTS
-- ============================================================================
-- This migration adds:
-- 1. Post type support for multi-template publishing
-- 2. Platform templates storage
-- 3. Published posts library (permanent archive)
-- 4. Content threads for strategist history
-- 5. Post content JSON field for flexible storage
-- ============================================================================

-- ============================================================================
-- ALTER POSTS TABLE
-- ============================================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'post';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_templates JSONB DEFAULT '{}';

-- ============================================================================
-- CREATE POST_LIBRARY TABLE (for published/archived posts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  original_post_id UUID,  -- link back to original post (if from posts table)
  title VARCHAR(255),
  topic VARCHAR(255),
  post_type VARCHAR(50),  -- feed, carousel, reel, story, video, short, slideshow
  platforms TEXT[],  -- array of platform names
  content JSONB,  -- flexible content structure
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  platform_data JSONB,  -- {platform: {post_id, url, type, status}}
  metrics JSONB,  -- analytics collected over time
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_post_library_workspace ON post_library(workspace_id);
CREATE INDEX idx_post_library_published_at ON post_library(published_at DESC);
CREATE INDEX idx_post_library_topic ON post_library(topic);
CREATE INDEX idx_post_library_created_by ON post_library(created_by);

-- ============================================================================
-- CREATE CONTENT_THREADS TABLE (for Content Strategist chat history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255),
  messages JSONB NOT NULL DEFAULT '[]',  -- array of {role: 'user'|'assistant', content, timestamp}
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,  -- soft delete

  CONSTRAINT messages_not_empty CHECK ((jsonb_array_length(messages) > 0) OR (messages = '[]'))
);

CREATE INDEX idx_content_threads_workspace ON content_threads(workspace_id);
CREATE INDEX idx_content_threads_created_at ON content_threads(created_at DESC);
CREATE INDEX idx_content_threads_deleted ON content_threads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_threads_created_by ON content_threads(created_by);

-- ============================================================================
-- HELPER FUNCTION: Get array length from JSONB
-- ============================================================================

CREATE OR REPLACE FUNCTION jsonb_array_length(arr JSONB) RETURNS INTEGER AS $$
BEGIN
  IF jsonb_typeof(arr) = 'array' THEN
    RETURN jsonb_array_length(arr);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UPDATED_AT TRIGGER FOR post_library
-- ============================================================================

CREATE OR REPLACE FUNCTION update_post_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_post_library_updated_at_trigger ON post_library;
CREATE TRIGGER update_post_library_updated_at_trigger
BEFORE UPDATE ON post_library
FOR EACH ROW
EXECUTE FUNCTION update_post_library_updated_at();

-- ============================================================================
-- UPDATED_AT TRIGGER FOR content_threads
-- ============================================================================

CREATE OR REPLACE FUNCTION update_content_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_content_threads_updated_at_trigger ON content_threads;
CREATE TRIGGER update_content_threads_updated_at_trigger
BEFORE UPDATE ON content_threads
FOR EACH ROW
EXECUTE FUNCTION update_content_threads_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS (if using RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE post_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see posts from their workspace
CREATE POLICY post_library_workspace_isolation ON post_library
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY content_threads_workspace_isolation ON content_threads
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 1. post_type values: 'post' (default), 'feed', 'carousel', 'reel', 'story', 'video', 'short', 'slideshow'
-- 2. platform_templates: Stores template variations for each platform (platform -> template data)
-- 3. post_library: Permanent archive of published posts. Can be queried by topic, date, platform
-- 4. content_threads: Stores conversation history from Content Strategist. Supports soft delete.
-- 5. All timestamps are UTC with timezone support
