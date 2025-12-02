# PLAN: Pingflare - Cloudflare-Native Uptime Monitoring Solution

## Problem Statement

Monitor ~30 services running on a Hetzner dedicated server from an external location (Cloudflare's global edge network) to avoid the "monitoring from the same server" anti-pattern.

## Overall Goal

Build a scalable, feature-rich uptime monitoring solution that runs natively within the Cloudflare ecosystem, similar to Uptime Kuma but serverless and globally distributed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │ Cron Trigger │────▶│   Worker     │────▶│    D1        │        │
│  │ (scheduled)  │     │ (checker)    │     │  (history)   │        │
│  └──────────────┘     └──────┬───────┘     └──────────────┘        │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Queues     │◀────│   Durable    │────▶│     KV       │        │
│  │(notifications)│     │   Object     │     │ (fast cache) │        │
│  └──────┬───────┘     │ (state mgmt) │     └──────────────┘        │
│         │             └──────┬───────┘                              │
│         │                    │ WebSocket                            │
│         ▼                    ▼                                      │
│  ┌──────────────┐     ┌──────────────┐                              │
│  │   Worker     │     │    Pages     │                              │
│  │ (notifier)   │     │ (Dashboard)  │                              │
│  └──────────────┘     └──────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Your Services   │
                    │  (Hetzner)       │
                    │  - HTTP/HTTPS    │
                    │  - TCP ports     │
                    │  - DNS records   │
                    └──────────────────┘
```

---

## Cloudflare Products & Their Roles

### 1. Workers (Core Logic)

- **Checker Worker**: Performs health checks (HTTP, TCP, DNS)
- **API Worker**: REST API for CRUD operations on monitors
- **Notifier Worker**: Processes notification queue

### 2. Cron Triggers (Scheduling)

- Triggers checker worker at configured intervals (minimum 1 minute)
- Multiple cron expressions for different check frequencies
- Example: `*/1 * * * *` for 1-minute checks, `*/5 * * * *` for 5-minute checks

### 3. D1 Database (Persistent Storage)

- Monitor configurations
- Check history (with retention policies)
- Incident logs
- Notification settings
- User/team data (future)

### 4. Durable Objects (Real-Time State)

- Per-monitor state management (current status, consecutive failures)
- WebSocket connections for live dashboard updates
- Incident detection and state machine
- Rate limiting for notifications

### 5. Workers KV (Fast Cache)

- Current status of all monitors (for public status pages)
- Cached aggregated statistics
- Session data (future auth)

### 6. Queues (Async Processing)

- Notification delivery (decouple from check logic)
- Retry failed notifications
- Dead letter queue for debugging

### 7. Pages (Frontend)

- SvelteKit dashboard with adapter-cloudflare
- Public status page
- Real-time updates via WebSocket to Durable Objects

---

## Supported Monitor Types

### Phase 1 (MVP)

1. **HTTP/HTTPS**: Status code, response time, keyword match, SSL expiry
2. **TCP**: Port connectivity check via `connect()` API

### Phase 2

3. **DNS**: Record type validation (A, AAAA, CNAME, MX, TXT)
4. **Keyword**: Check for presence/absence of text in response

### Phase 3

5. **JSON Query**: JSONPath validation on API responses
6. **Push/Heartbeat**: Passive monitors expecting periodic pings
7. **SSL Certificate**: Expiry monitoring, chain validation

---

## Database Schema (D1)

```sql
-- Monitors table
CREATE TABLE monitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- http, tcp, dns, push
  url TEXT,
  hostname TEXT,
  port INTEGER,
  method TEXT DEFAULT 'GET',
  expected_status INTEGER DEFAULT 200,
  keyword TEXT,
  keyword_type TEXT, -- present, absent
  interval INTEGER DEFAULT 60, -- seconds
  timeout INTEGER DEFAULT 30, -- seconds
  retry_count INTEGER DEFAULT 3,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Check history (partitioned by time, pruned regularly)
CREATE TABLE checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL, -- up, down, degraded
  response_time INTEGER, -- milliseconds
  status_code INTEGER,
  error_message TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  checked_from TEXT, -- Cloudflare colo code
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

-- Incidents (status changes)
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL, -- ongoing, resolved
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  duration INTEGER, -- seconds
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

-- Notification channels
CREATE TABLE notification_channels (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- webhook, email, slack, discord, telegram
  name TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON configuration
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Monitor-notification mapping
CREATE TABLE monitor_notifications (
  monitor_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  notify_on TEXT DEFAULT 'down,up', -- comma-separated events
  PRIMARY KEY (monitor_id, channel_id),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES notification_channels(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_checks_monitor_time ON checks(monitor_id, checked_at DESC);
CREATE INDEX idx_incidents_monitor ON incidents(monitor_id);
CREATE INDEX idx_incidents_status ON incidents(status);
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)

**Goal**: Basic HTTP monitoring with status page

1. Project restructure for Cloudflare
   - Switch to `@sveltejs/adapter-cloudflare`
   - Add `wrangler.toml` configuration
   - Set up D1 database binding

2. Database setup
   - Create D1 database
   - Run migrations for monitors, checks tables

3. Checker Worker
   - HTTP/HTTPS health check implementation
   - Cron trigger setup (1-minute interval)
   - Basic error handling and timeout

4. API Worker
   - CRUD endpoints for monitors
   - Basic authentication (API key)

5. Dashboard (SvelteKit)
   - Monitor list view
   - Add/edit monitor form
   - Current status display

6. Status persistence
   - Store check results in D1
   - Update KV with current status

### Phase 2: Real-Time & Notifications

**Goal**: Live updates and alerting

1. Durable Objects setup
   - MonitorState DO for per-monitor state
   - WebSocket support for live updates
   - Incident detection logic

2. Notification system
   - Queue setup for async delivery
   - Webhook notification worker
   - Discord/Slack integration

3. Dashboard enhancements
   - Real-time status via WebSocket
   - Response time graphs
   - Incident timeline

### Phase 3: Advanced Monitoring

**Goal**: Feature parity with Uptime Kuma

1. Additional monitor types
   - TCP via `connect()` API
   - DNS resolution checks
   - Push/heartbeat monitors

2. Advanced HTTP features
   - Custom headers
   - Basic/Bearer auth
   - POST body support
   - SSL certificate monitoring

3. Status pages
   - Public status page generator
   - Custom domains
   - Incident announcements

### Phase 4: Multi-Region & Scale

**Goal**: Geo-distributed monitoring

1. Multi-region checks
   - Run checks from multiple Cloudflare colos
   - Aggregate results for accuracy
   - Avoid false positives from regional issues

2. Team features
   - User authentication (Cloudflare Access or custom)
   - Role-based permissions
   - Audit logging

3. Analytics
   - Uptime percentage calculations
   - Response time percentiles
   - Historical trend analysis

---

## File Structure (Target)

```
pingflare/
├── src/
│   ├── lib/
│   │   ├── components/        # Svelte components
│   │   │   ├── MonitorCard.svelte
│   │   │   ├── StatusBadge.svelte
│   │   │   └── ResponseChart.svelte
│   │   ├── server/
│   │   │   ├── db/            # D1 database operations
│   │   │   │   ├── monitors.ts
│   │   │   │   ├── checks.ts
│   │   │   │   └── schema.sql
│   │   │   ├── checkers/      # Health check implementations
│   │   │   │   ├── http.ts
│   │   │   │   ├── tcp.ts
│   │   │   │   └── dns.ts
│   │   │   └── notifications/ # Notification handlers
│   │   │       ├── webhook.ts
│   │   │       └── discord.ts
│   │   ├── stores/            # Svelte stores
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte       # Dashboard
│   │   ├── monitors/
│   │   │   ├── +page.svelte   # Monitor list
│   │   │   ├── [id]/
│   │   │   │   └── +page.svelte
│   │   │   └── new/
│   │   │       └── +page.svelte
│   │   ├── status/            # Public status page
│   │   │   └── +page.svelte
│   │   └── api/               # API routes
│   │       ├── monitors/
│   │       │   └── +server.ts
│   │       └── checks/
│   │           └── +server.ts
│   └── workers/               # Standalone workers
│       ├── checker.ts         # Cron-triggered checker
│       └── notifier.ts        # Queue consumer
├── migrations/                # D1 migrations
│   └── 0001_initial.sql
├── wrangler.toml              # Cloudflare configuration
├── svelte.config.js
└── package.json
```

---

## Wrangler Configuration (Target)

```toml
name = "pingflare"
main = "src/workers/checker.ts"
compatibility_date = "2024-01-01"

# Cron triggers for scheduled checks
[triggers]
crons = ["* * * * *"]  # Every minute

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "pingflare"
database_id = "<will-be-generated>"

# KV Namespace
[[kv_namespaces]]
binding = "STATUS_CACHE"
id = "<will-be-generated>"

# Durable Objects
[[durable_objects.bindings]]
name = "MONITOR_STATE"
class_name = "MonitorState"

[[migrations]]
tag = "v1"
new_classes = ["MonitorState"]

# Queue for notifications
[[queues.producers]]
queue = "notifications"
binding = "NOTIFICATION_QUEUE"

[[queues.consumers]]
queue = "notifications"
max_batch_size = 10
max_batch_timeout = 30
```

---

## Cost Estimation (Free Tier Viability)

### For 30 monitors at 1-minute intervals:

- **Cron invocations**: 1/min × 60 × 24 = 1,440/day
- **Check requests**: 30 × 1,440 = 43,200/day
- **Free tier limit**: 100,000 requests/day ✅

### Storage (D1):

- ~1KB per check × 43,200/day × 30 days = ~1.3GB
- Implement 7-day retention to stay under 10GB limit ✅

### KV operations:

- 30 writes/min × 1,440 = 43,200 writes/day
- Free tier: 1,000 writes/day ❌
- **Solution**: Batch updates or use Durable Objects for current state

### Recommendation:

- MVP works on free tier with some optimizations
- For 30 monitors with full features: $5/month Workers Paid plan

---

## Existing Open Source Reference

### UptimeFlare (https://github.com/lyc8503/UptimeFlare)

- Already implements Cloudflare Workers + KV approach
- Good reference for check implementations
- Limited to status page (no full dashboard)

### cf-workers-status-page (https://github.com/eidam/cf-workers-status-page)

- Simple KV-based approach
- Cron + KV + static page
- Max 25 monitors with Slack notifications

Our approach improves on these by:

- Using D1 for relational data and history
- Durable Objects for real-time state
- Full CRUD dashboard with SvelteKit
- Queues for reliable notifications

---

## Next Step

Awaiting approval to begin Phase 1 implementation.

Starting with:

1. Switch adapter to cloudflare
2. Add wrangler.toml
3. Create D1 schema
4. Implement basic HTTP checker
5. Build monitor CRUD API
6. Create dashboard UI
