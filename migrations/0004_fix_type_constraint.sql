-- Fix type CHECK constraint to include 'script'
-- SQLite doesn't support ALTER TABLE to modify constraints, so we recreate the table

-- Create new monitors table with updated constraint
CREATE TABLE monitors_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'tcp', 'dns', 'push', 'script')),
  url TEXT,
  hostname TEXT,
  port INTEGER,
  method TEXT DEFAULT 'GET',
  expected_status INTEGER DEFAULT 200,
  keyword TEXT,
  keyword_type TEXT CHECK (keyword_type IN ('present', 'absent', NULL)),
  interval_seconds INTEGER DEFAULT 60,
  timeout_ms INTEGER DEFAULT 30000,
  retry_count INTEGER DEFAULT 3,
  active INTEGER DEFAULT 1,
  script TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Copy existing data
INSERT INTO monitors_new SELECT * FROM monitors;

-- Drop old table
DROP TABLE monitors;

-- Rename new table
ALTER TABLE monitors_new RENAME TO monitors;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(active);
