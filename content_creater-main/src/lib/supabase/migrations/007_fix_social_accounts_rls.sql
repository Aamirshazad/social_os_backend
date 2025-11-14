-- ============================================
-- Migration: Fix Social Accounts RLS Policy
-- Date: 2025-11-07
-- Description: Fixes RLS policy to allow admins to insert social accounts
-- The issue: USING clause is checked for SELECT/UPDATE/DELETE
--            WITH CHECK clause is checked for INSERT/UPDATE
--            We need both!
-- ============================================

-- Drop the existing policies
DROP POLICY IF EXISTS "Admins can manage social accounts" ON social_accounts;
DROP POLICY IF EXISTS "Users can view social accounts in their workspace" ON social_accounts;

-- Create SELECT policy (read-only for all workspace members)
CREATE POLICY "Users can view social accounts in their workspace"
    ON social_accounts FOR SELECT
    USING (workspace_id = get_user_workspace_id());

-- Create INSERT policy (admins and editors only)
CREATE POLICY "Admins can insert social accounts"
    ON social_accounts FOR INSERT
    WITH CHECK (
        workspace_id = get_user_workspace_id()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND workspace_id = get_user_workspace_id()
            AND role IN ('admin', 'editor')
        )
    );

-- Create UPDATE policy (admins and editors only)
CREATE POLICY "Admins can update social accounts"
    ON social_accounts FOR UPDATE
    USING (
        workspace_id = get_user_workspace_id()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND workspace_id = get_user_workspace_id()
            AND role IN ('admin', 'editor')
        )
    )
    WITH CHECK (
        workspace_id = get_user_workspace_id()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND workspace_id = get_user_workspace_id()
            AND role IN ('admin', 'editor')
        )
    );

-- Create DELETE policy (admins only)
CREATE POLICY "Admins can delete social accounts"
    ON social_accounts FOR DELETE
    USING (
        workspace_id = get_user_workspace_id()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND workspace_id = get_user_workspace_id()
            AND role = 'admin'
        )
    );

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Add helpful comments
COMMENT ON POLICY "Users can view social accounts in their workspace" ON social_accounts 
IS 'All workspace members can view social accounts';

COMMENT ON POLICY "Admins can insert social accounts" ON social_accounts 
IS 'Admins and editors can add new social accounts';

COMMENT ON POLICY "Admins can update social accounts" ON social_accounts 
IS 'Admins and editors can update social accounts';

COMMENT ON POLICY "Admins can delete social accounts" ON social_accounts 
IS 'Only admins can delete social accounts';
