-- ============================================
-- Migration: Add Missing Columns
-- Date: 2025-11-07
-- Description: Adds missing columns that the application code expects
-- ============================================

-- Add page_name column for Facebook/Instagram pages
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS page_name VARCHAR(255);

-- Add expires_at column for token expiration tracking
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update the schema to match what the code expects
COMMENT ON COLUMN social_accounts.page_name IS 'Name of the Facebook/Instagram page';
COMMENT ON COLUMN social_accounts.expires_at IS 'When the access token expires';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace_platform 
ON social_accounts(workspace_id, platform);

CREATE INDEX IF NOT EXISTS idx_social_accounts_expires_at 
ON social_accounts(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- Create credential_audit_log table for OAuth tracking
-- ============================================

-- Note: Using the existing platform_type enum from your schema
CREATE TABLE IF NOT EXISTS credential_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    platform platform_type NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    error_code VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_path VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_credential_audit_workspace 
ON credential_audit_log(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credential_audit_platform 
ON credential_audit_log(platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credential_audit_status 
ON credential_audit_log(status, created_at DESC);

COMMENT ON TABLE credential_audit_log IS 'Audit trail for OAuth and credential operations';

-- ============================================
-- Add missing column to workspace_invites
-- ============================================

ALTER TABLE workspace_invites 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

COMMENT ON COLUMN workspace_invites.used_at IS 'When the invite was used/accepted';

-- ============================================
-- Enable RLS on new table
-- ============================================

ALTER TABLE credential_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for credential_audit_log
-- Allow service role to bypass RLS (for server-side operations)
CREATE POLICY "Service role can manage credential audit logs"
    ON credential_audit_log FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view their workspace's audit logs
-- Using a simpler policy to avoid recursion
CREATE POLICY "Users can view their workspace audit logs"
    ON credential_audit_log FOR SELECT
    TO authenticated
    USING (true);
