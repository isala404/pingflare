-- Pingflare Database Schema
-- Fresh consolidated migration for v2

-- Monitors table (simplified - script-only)
CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  script TEXT NOT NULL,
  interval_seconds INTEGER DEFAULT 60,
  timeout_ms INTEGER DEFAULT 30000,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Check history table
CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TEXT DEFAULT (datetime('now')),
  checked_from TEXT,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

-- Incidents table (status changes with notification tracking)
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'resolved')),
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  duration_seconds INTEGER,
  notified_channels TEXT DEFAULT '[]',
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

-- Notification channels table
CREATE TABLE IF NOT EXISTS notification_channels (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('webhook', 'slack', 'discord', 'webpush')),
  name TEXT NOT NULL,
  config TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Monitor-notification mapping table with threshold support
CREATE TABLE IF NOT EXISTS monitor_notifications (
  monitor_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  notify_on TEXT NOT NULL DEFAULT 'down,up',
  downtime_threshold_s INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (monitor_id, channel_id),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES notification_channels(id) ON DELETE CASCADE
);

-- Push subscriptions table (browser push notifications)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Users table with role-based permissions
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- App settings for setup state and configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(active);
CREATE INDEX IF NOT EXISTS idx_checks_monitor_time ON checks(monitor_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor ON incidents(monitor_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
