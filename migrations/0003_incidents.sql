-- Incidents table (like "Elevated error rates on Opus 4.5")
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

-- Incident updates (timeline entries)
CREATE TABLE IF NOT EXISTS incident_updates (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates(incident_id, created_at DESC);

-- Daily aggregates for the 90-day uptime bars (simpler than hourly)
CREATE TABLE IF NOT EXISTS daily_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_checks INTEGER DEFAULT 0,
  up_checks INTEGER DEFAULT 0,
  down_checks INTEGER DEFAULT 0,
  degraded_checks INTEGER DEFAULT 0,
  downtime_minutes INTEGER DEFAULT 0,
  UNIQUE(monitor_id, date),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_daily_status_monitor_date ON daily_status(monitor_id, date DESC);
