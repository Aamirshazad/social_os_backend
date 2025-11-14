-- Migration: Add 'ready_to_publish' to post_status enum
-- Description: Adds the 'ready_to_publish' status between 'approved' and 'scheduled'
-- Date: 2025-11-10

-- Add 'ready_to_publish' to the post_status enum
-- Note: Cannot specify position in enum with ALTER TYPE, so the order will be at the end
-- This is fine as enums in PostgreSQL maintain insertion order
ALTER TYPE post_status ADD VALUE IF NOT EXISTS 'ready_to_publish' BEFORE 'scheduled';

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'post_status'::regtype 
    AND enumlabel = 'ready_to_publish'
  ) THEN
    RAISE NOTICE 'Successfully added ready_to_publish to post_status enum';
  ELSE
    RAISE EXCEPTION 'Failed to add ready_to_publish to post_status enum';
  END IF;
END $$;
