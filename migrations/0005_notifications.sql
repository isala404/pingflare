-- Migration 0005: Notification system enhancements
-- Adds web push support, threshold-based alerting, and incident notification tracking

-- Push subscriptions table (one per browser)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Recreate notification_channels with 'webpush' type
-- SQLite doesn't support ALTER TABLE to modify constraints
CREATE TABLE notification_channels_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('webhook', 'slack', 'discord', 'webpush')),
  name TEXT NOT NULL,
  config TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Copy existing data (only webhook, slack, discord types will be preserved)
INSERT INTO notification_channels_new (id, type, name, config, active, created_at)
SELECT id, type, name, config, active, created_at
FROM notification_channels
WHERE type IN ('webhook', 'slack', 'discord');

-- Drop old table and rename
DROP TABLE notification_channels;
ALTER TABLE notification_channels_new RENAME TO notification_channels;

-- Recreate monitor_notifications with downtime threshold
CREATE TABLE monitor_notifications_new (
  monitor_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  notify_on TEXT NOT NULL DEFAULT 'down,up',
  downtime_threshold_s INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (monitor_id, channel_id),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES notification_channels(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO monitor_notifications_new (monitor_id, channel_id, notify_on, downtime_threshold_s)
SELECT monitor_id, channel_id, notify_on, 0
FROM monitor_notifications;

-- Drop old table and rename
DROP TABLE monitor_notifications;
ALTER TABLE monitor_notifications_new RENAME TO monitor_notifications;

-- Add notified_channels column to incidents for tracking sent alerts
-- Using a new table since SQLite ALTER TABLE is limited
CREATE TABLE incidents_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'resolved')),
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  duration_seconds INTEGER,
  notified_channels TEXT DEFAULT '[]',
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO incidents_new (id, monitor_id, status, started_at, resolved_at, duration_seconds, notified_channels)
SELECT id, monitor_id, status, started_at, resolved_at, duration_seconds, '[]'
FROM incidents;

-- Drop old table and rename
DROP TABLE incidents;
ALTER TABLE incidents_new RENAME TO incidents;

-- Recreate indexes for incidents
CREATE INDEX IF NOT EXISTS idx_incidents_monitor ON incidents(monitor_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- Index for push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
