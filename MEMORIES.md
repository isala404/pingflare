Tooling

- Stack: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4
- Package manager: bun
- Test command: bun test (bun:test)
- Lint command: bun lint
- Format command: bun format
- Check command: bun check
- PWA support: @vite-pwa/sveltekit

Build & Deploy

- Build: bun run build (SvelteKit + custom worker bundling via esbuild)
- Deploy: bun run deploy (applies D1 migrations + wrangler deploy)
- Output directory: dist/ (static assets + _worker.js)
- Cron: Integrated scheduled() handler, runs every minute
- Deploy button: One-click deployment from GitHub supported

Project Context

- Name: pingflare - Cloudflare-native uptime monitoring solution
- Goal: Monitor ~30 services on Hetzner dedicated server from external Cloudflare infrastructure
- Inspiration: Uptime Kuma but serverless on Cloudflare ecosystem
- Deployed at: https://pingflare.pages.dev
- Current state: MVP complete with HTTP/Script monitoring, dashboard, authentication

Cloudflare Resources

- D1 Database: pingflare-db (binding: DB)
- Workers Project: pingflare (with Static Assets)
- ASSETS binding: Fetcher for static file serving

Directory Structure

- src/lib/components/ - Svelte components (MonitorCard, MonitorForm, ScriptBuilder, ScriptEditor, NotificationChannelCard, NotificationChannelForm, etc.)
- src/lib/components/ui/ - UI primitives (Button, Input, Select, Textarea, Card, Alert, Badge, Spinner, IconButton)
- src/lib/components/layout/ - Layout components (AppShell, Header, BottomNav, PageHeader, Container)
- src/lib/utils/ - Utility functions (format.ts)
- src/lib/server/checkers/ - Health check implementations (script.ts executor, index.ts orchestrator)
- src/lib/server/db/ - Database operations (monitors.ts, auth.ts, notifications.ts)
- src/lib/server/notifications/ - Notification senders (slack.ts, discord.ts, webhook.ts, webpush.ts, index.ts)
- src/lib/types/ - TypeScript interfaces (monitor.ts, auth.ts, script.ts, notification.ts)
- src/routes/ - SvelteKit pages (dashboard, /login, /setup, /settings, /monitors/new, /monitors/[id]/edit, /notifications)
- src/routes/api/ - REST API endpoints
- src/hooks.server.ts - Auth middleware, route protection
- src/worker.ts - Custom worker entry (not used directly, template for build)
- scripts/build-worker.js - Post-build worker bundling script
- migrations/ - D1 SQL migration (single consolidated file: 0001_schema.sql)

Database Schema

- monitor_groups: id, name, slug, description, is_public, display_order, created_at
- monitors: id, name, group_id (FK), interval_seconds, timeout_ms, active, script (JSON DSL), created_at, updated_at
- checks: id, monitor_id (FK), status, response_time_ms, status_code, error_message, checked_at, checked_from
- incidents: id, title, status, group_id (FK), created_at, resolved_at
- incident_updates: id, incident_id (FK), status, message, created_at
- daily_status: monitor_id, date, total_checks, up_checks, down_checks, degraded_checks, downtime_minutes
- notification_channels: id, type (webhook/slack/discord/webpush), name, config (JSON), active, created_at
- monitor_notifications: monitor_id, channel_id, notify_on (CSV), downtime_threshold_s (junction table)
- push_subscriptions: id, endpoint (unique), p256dh, auth, user_agent, created_at
- users: id, name, email (unique), password_hash, role, created_at, updated_at, last_login_at
- sessions: id, user_id (FK), expires_at, created_at
- app_settings: key, value, updated_at

API Endpoints

- GET/POST /api/monitors - List/create monitors
- GET/PUT/DELETE /api/monitors/[id] - Single monitor CRUD
- GET /api/cron - Trigger health checks (manual or cron)
- GET /api/status - Status endpoint (public, queries D1 directly)
- GET/POST /api/groups - List/create monitor groups
- GET/PUT/DELETE /api/groups/[id] - Single group CRUD
- GET/POST /api/incidents - List/create incidents (requires group_id)
- GET/POST/DELETE /api/incidents/[id] - Single incident operations
- GET /api/auth/status - Check setup state and current user
- POST /api/auth/setup - Create initial admin (name, email, password)
- POST /api/auth/login - Email/password authentication
- POST /api/auth/logout - Delete session
- PUT /api/auth/profile - Update user name
- PUT /api/auth/password - Change password
- GET/POST /api/notification-channels - List/create notification channels
- GET/PUT/DELETE /api/notification-channels/[id] - Single channel CRUD
- POST /api/notification-channels/[id]/test - Send test notification
- GET /api/push/vapid-key - Get VAPID public key for browser subscription
- POST/DELETE /api/push/subscribe - Manage push subscriptions
- GET /api/monitors/[id]/notifications - Get monitor's notification subscriptions

Authentication

- Session-based auth with cookies (7-day expiry)
- SHA-256 password hashing via Web Crypto API
- User fields: name, email (login), password
- Role-based permissions: admin/editor/viewer (defined in src/lib/types/auth.ts)
- First visit redirects to /setup, subsequent visits to /login
- Settings page at /settings for profile and password management
- API auth pattern: each handler checks `if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })`
- Public API: /api/public/*, /api/auth/*
- Protected API: all other endpoints require authenticated session
- /api/cron: requires CRON_SECRET env var, validates X-Cron-Secret header (internal scheduled handler only)
- /api/status: requires auth (returns all monitors, use /api/public/status for public data)
- CRON_SECRET: required secret for cron, set via `wrangler secret put CRON_SECRET`

Monitor Types

- All monitors use JSON DSL script format (no separate http/tcp types)
- tcp/dns: Planned (schema exists)
- push: Passive monitors (different flow)

Script Checker (JSON DSL)

- All monitors use JSON-based DSL for health checks
- UI: Visual Builder (ScriptBuilder.svelte) or Code mode (ScriptEditor.svelte) with toggle
- Supports chained requests: GET, POST, PUT, DELETE, PATCH, HEAD
- Variable extraction: "extract": { "token": "json.access_token" }
- Variable interpolation: ${varName} in URLs, headers, body
- Assertions: equals, notEquals, contains, notContains, matches (regex), greaterThan, lessThan, greaterOrEqual, lessOrEqual, minLength, maxLength, hasLength, hasKey, exists
- Assertion severity: each assertion has optional "severity": "degraded" | "down" (default: degraded)
- Path notation: json.user.name, json.items[0].id, status, responseTime, body, headers.content-type
- responseTime: per-step response time in ms, use for performance assertions (e.g., { "check": "responseTime", "lessThan": 500 })
- Status determination: request fails = down, assertion with severity=down fails = down, assertion with severity=degraded fails = degraded, all pass = up
- Validation function: validateScript() in src/lib/server/checkers/script.ts
- Shared types: src/lib/types/script.ts (ScriptDSL, ScriptStep, Assertion, AssertionSeverity, HttpMethod)

Scheduler (Integrated)

- Cron handler integrated in main Worker (scheduled() export)
- Triggers /api/cron internally every minute via cron trigger
- Configured in wrangler.toml [triggers] section
- No separate deployment needed

Svelte 5 Patterns

- $state() for reactive state variables
- $derived() for computed values (e.g., upCount, downCount)
- $effect() for side effects (auto-refresh, cleanup)
- $props() for component props with destructuring
- Snippet type for component children (Modal)
- @render for rendering snippets

Coding Patterns

- Checker orchestrator: src/lib/server/checkers/index.ts routes by monitor type
- Dependency injection: db passed to all functions (testable)
- Promise.allSettled() for parallel checks (tolerates individual failures)
- DTO pattern: userToPublic() removes password_hash
- Dynamic SQL in updateMonitor() for partial updates

Future Cloudflare Products

- Durable Objects: Real-time WebSocket for live updates (Phase 2)
- Queues: Async notification processing (Phase 2)

Architectural Constraints

- Cron triggers max 25 monitors due to 50 subrequest limit per invocation
- Cloudflare Workers blocks eval/new Function (script checker uses JSON DSL, not JS eval)
- Workers can make outbound TCP connections via connect() API from cloudflare:sockets
- Free tier: 100k requests/day, 10ms CPU/request

UI Component Library

- Button: variants (primary/secondary/danger/ghost), sizes (sm/md/lg), loading state, href support
- Input: types (text/email/password/number/url), label, error, helper text
- Select: dropdown with label and error
- Textarea: with label, error, monospace option
- Card: container with optional header/footer snippets, padding sizes
- Alert: variants (error/success/warning/info), dismissible
- Badge: status indicators, maps MonitorStatus to colors
- Spinner: loading indicator, sizes (sm/md/lg)
- IconButton: icons (edit/delete/add/chevron-up/chevron-down/close/back/menu/check/refresh)

Layout Components

- AppShell: combines Header (desktop) + content + BottomNav (mobile)
- Header: desktop header with logo, nav links, user menu, logout
- BottomNav: fixed bottom nav for mobile with 4 items (Dashboard/Add/Alerts/Settings)
- PageHeader: title, optional subtitle, back button, actions snippet
- Container: max-width wrapper with sizes (sm/md/lg/xl/full)

Not Yet Implemented

- Email and Telegram notification channels
- TCP/DNS checkers (scaffolded)
- Downtime threshold enforcement per channel (schema ready, cron not fully integrated)

User Preferences

- Never include "Claude" or "Claude Code" or co author tags in any git commit messages.
