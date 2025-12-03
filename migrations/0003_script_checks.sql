-- Add script type and script field to monitors for custom JavaScript health checks
ALTER TABLE monitors ADD COLUMN script TEXT;

-- Update type check to include 'script' type
-- SQLite doesn't support modifying CHECK constraints, so we work with what we have
-- The 'script' type will be validated at the application level
