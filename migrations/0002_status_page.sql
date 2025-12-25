-- Migration: Add public status page support
-- Adds public visibility flag, status announcements, and hourly check aggregates

-- Add public visibility to monitors
ALTER TABLE monitors ADD COLUMN is_public INTEGER DEFAULT 0;

-- Status announcements table for maintenance notices and incident updates
CREATE TABLE IF NOT EXISTS status_announcements (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'incident', 'resolved', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON status_announcements(active, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON status_announcements(starts_at, ends_at);

-- Hourly aggregates for efficient historical uptime queries
-- Used for 30-day charts, 6-month and 1-year uptime calculations
CREATE TABLE IF NOT EXISTS check_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  hour_bucket TEXT NOT NULL,  -- ISO format: "2025-01-15T14:00:00Z"
  total_checks INTEGER DEFAULT 0,
  up_checks INTEGER DEFAULT 0,
  down_checks INTEGER DEFAULT 0,
  degraded_checks INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  UNIQUE(monitor_id, hour_bucket),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aggregates_monitor_hour ON check_aggregates(monitor_id, hour_bucket DESC);
