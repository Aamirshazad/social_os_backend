-- ============================================
-- Migration: Fix RLS Infinite Recursion
-- Date: 2025-11-07
-- Description: Fixes infinite recursion in users table RLS policies
-- ============================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view workspace members" ON users;

-- Create a non-recursive policy using a helper function
-- First, create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT workspace_id 
    FROM users 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Now create the policy using the helper function
CREATE POLICY "Users can view workspace members"
    ON users FOR SELECT
    USING (workspace_id = get_user_workspace_id());

-- Also update other potentially recursive policies
DROP POLICY IF EXISTS "Admins can manage workspace invites" ON workspace_invites;

CREATE POLICY "Admins can manage workspace invites"
    ON workspace_invites FOR ALL
    USING (
        workspace_id = get_user_workspace_id()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND workspace_id = workspace_invites.workspace_id
            AND role = 'admin'
        )
    );

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION get_user_workspace_id() IS 'Helper function to get current user workspace ID without RLS recursion';
