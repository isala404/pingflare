-- Monitor groups table
CREATE TABLE IF NOT EXISTS monitor_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_groups_order ON monitor_groups(display_order ASC);

-- Add group_id to monitors
ALTER TABLE monitors ADD COLUMN group_id TEXT REFERENCES monitor_groups(id) ON DELETE SET NULL;

-- Add group_id to incidents
ALTER TABLE incidents ADD COLUMN group_id TEXT REFERENCES monitor_groups(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_incidents_group ON incidents(group_id);
