Tooling

- Stack: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4
- Package manager: bun
- Test command: bun test (bun:test)
- Lint command: bun lint
- Format command: bun format
- Check command: bun check
- PWA support: @vite-pwa/sveltekit

Build & Deploy

- Build: bun run build
- Deploy main app: wrangler pages deploy .svelte-kit/cloudflare --commit-dirty=true
- Deploy scheduler: cd workers/scheduler && wrangler deploy
- Apply migrations: wrangler d1 migrations apply pingflare-db --remote
- Full deploy: bun run build && wrangler pages deploy .svelte-kit/cloudflare --commit-dirty=true

Project Context

- Name: pingflare - Cloudflare-native uptime monitoring solution
- Goal: Monitor ~30 services on Hetzner dedicated server from external Cloudflare infrastructure
- Inspiration: Uptime Kuma but serverless on Cloudflare ecosystem
- Deployed at: https://pingflare.pages.dev
- Current state: MVP complete with HTTP/Script monitoring, dashboard, KV caching, authentication

Cloudflare Resources

- D1 Database: pingflare-db (74b11544-7a08-46b5-851c-8ec5ef153e70)
- KV Namespace: STATUS_CACHE (bcb87ba93beb493bad285feff7362a2e)
- Pages Project: pingflare

Directory Structure

- src/lib/components/ - Svelte components (MonitorCard, MonitorForm, Modal, StatusBadge, ReloadPrompt, ScriptBuilder, ScriptEditor)
- src/lib/server/checkers/ - Health check implementations (script.ts executor, index.ts orchestrator)
- src/lib/server/db/ - Database operations (monitors.ts, auth.ts, notifications.ts)
- src/lib/server/notifications/ - Notification senders (slack.ts, discord.ts, webhook.ts, webpush.ts, index.ts)
- src/lib/server/cache.ts - KV caching layer
- src/lib/types/ - TypeScript interfaces (monitor.ts, auth.ts, script.ts)
- src/routes/ - SvelteKit pages (dashboard, /login, /setup, /settings, /monitors/new, /monitors/[id]/edit)
- src/routes/api/ - REST API endpoints
- src/hooks.server.ts - Auth middleware, route protection
- workers/scheduler/ - Separate Worker for cron triggers
- migrations/ - D1 SQL migrations (0001-0004)

Database Schema

- monitors: id, name, type, url, hostname, port, method, expected_status, keyword, keyword_type, interval_seconds, timeout_ms, retry_count, active, script, created_at, updated_at
- checks: id, monitor_id (FK), status, response_time_ms, status_code, error_message, checked_at, checked_from
- incidents: id, monitor_id (FK), status (ongoing/resolved), started_at, resolved_at, duration_seconds, notified_channels (JSON)
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
- GET /api/status - Fast status from KV cache (public)
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
- Protected routes: all except /login, /setup, /api/auth/\*, /api/cron, /api/status
- Settings page at /settings for profile and password management

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
- Path notation: json.user.name, json.items[0].id, status, body, headers.content-type
- Status: all pass = up, request fails = down, assertion fails = degraded
- Validation function: validateScript() in src/lib/server/checkers/script.ts
- Shared types: src/lib/types/script.ts (ScriptDSL, ScriptStep, Assertion, HttpMethod)

Caching Strategy

- KV key "status:{monitorId}" - individual monitor status (5-minute TTL)
- KV key "all_status" - aggregated status for dashboard (1-minute TTL)
- /api/status tries KV first, falls back to DB query

Scheduler Worker

- Separate Cloudflare Worker at workers/scheduler/
- Triggers /api/cron every minute via cron trigger
- Deploy: cd workers/scheduler && wrangler deploy
- Has /trigger endpoint for manual testing

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
- Cache-aside pattern: KV cache with DB fallback
- DTO pattern: userToPublic() removes password_hash
- Dynamic SQL in updateMonitor() for partial updates

Future Cloudflare Products

- Durable Objects: Real-time WebSocket for live updates (Phase 2)
- Queues: Async notification processing (Phase 2)

Architectural Constraints

- Cron triggers max 25 monitors due to 50 subrequest limit per invocation
- Cloudflare Workers blocks eval/new Function (script checker uses JSON DSL, not JS eval)
- Workers can make outbound TCP connections via connect() API from cloudflare:sockets
- Free tier: 100k requests/day, 10ms CPU/request, 1GB KV storage

Not Yet Implemented

- Email and Telegram notification channels
- TCP/DNS checkers (scaffolded)
- Retry logic (retry_count field unused)
- Downtime threshold enforcement per channel (schema ready, cron not fully integrated)

User Preferences

- Never include "Claude" or "Claude Code" or co author tags in any git commit messages.
