-- Migration: Move visibility to groups, add slug for URLs
-- Groups control public visibility, not individual monitors

-- Add slug and is_public to groups
ALTER TABLE monitor_groups ADD COLUMN slug TEXT;
ALTER TABLE monitor_groups ADD COLUMN is_public INTEGER DEFAULT 0;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_slug ON monitor_groups(slug);
