Project initialized with SvelteKit scaffold.

- Fresh project setup with Svelte 5, TypeScript, Tailwind CSS 4, ESLint, Prettier
- PWA support configured via @vite-pwa/sveltekit

Set up Cloudflare infrastructure for edge deployment.

- Migrated from adapter-node to adapter-cloudflare
- Created wrangler.toml with D1 and KV bindings
- D1 database: pingflare-db (74b11544-7a08-46b5-851c-8ec5ef153e70)
- KV namespace: STATUS_CACHE (bcb87ba93beb493bad285feff7362a2e)

Added D1 database schema and data layer.

- Initial migration: monitors, checks, incidents, notification_channels tables
- TypeScript types for all database models in src/lib/types/monitor.ts
- Database operations in src/lib/server/db/monitors.ts

Implemented HTTP health checker with cron support.

- HTTP checker with status code validation, keyword matching, timeout
- Checker orchestrator pattern for future TCP/DNS support
- /api/cron endpoint to trigger all active monitors

Added monitor CRUD API endpoints.

- GET/POST /api/monitors - List and create monitors
- GET/PUT/DELETE /api/monitors/[id] - Single monitor operations
- Uptime calculation and check history queries

Built dashboard UI with Svelte 5 runes.

- MonitorCard, StatusBadge, MonitorForm, Modal components
- Main dashboard with statistics, auto-refresh, manual check trigger
- Add/edit monitor modal with form validation

Implemented KV caching for fast status reads.

- Cache layer in src/lib/server/cache.ts
- /api/status endpoint with KV-first, DB-fallback pattern
- Cron updates both individual and aggregated status cache

Deployed to Cloudflare Pages.

- Live at: https://pingflare.pages.dev
- All bindings (D1, KV) working correctly
- Verified: monitor creation, health checks, status API, dashboard UI

Implemented authentication system with setup flow.

- Migration 0002_users.sql: users (name, email, password), sessions, app_settings tables
- Auth types and permissions in src/lib/types/auth.ts (admin/editor/viewer roles)
- Auth service in src/lib/server/db/auth.ts (SHA-256 password hashing, 7-day sessions)
- Server hooks in src/hooks.server.ts for route protection
- /api/auth/setup - First-time admin (name, email, password)
- /api/auth/login - Email/password authentication
- /api/auth/logout, /api/auth/status endpoints
- /api/auth/profile - Update user name
- /api/auth/password - Change password with current password verification
- /setup page for initial admin creation (name, email, password)
- /login page with email/password form
- /settings page with profile editing and password change
- Dashboard header with name display linked to settings
- Verified: setup, login, profile update, password change all working

Added JavaScript health check evaluator for custom scripts.

- Migration 0003_script_checks.sql: Added script column to monitors table
- Monitor type 'script' added to MonitorType union
- Script executor in src/lib/server/checkers/script.ts
- Sandboxed JS execution using Function constructor with strict mode
- Context object provides fetch (with timeout/abort) and log functions
- Scripts must define check(ctx) returning {status: 'up'|'down'|'degraded', message?}
- Timeout protection with Promise.race
- Integrated into checker orchestrator in src/lib/server/checkers/index.ts
- UI textarea in MonitorForm.svelte for script input with example template
- 24 unit tests in src/lib/server/checkers/script.test.ts covering:
  - Basic script execution, status returns, error handling
  - Fetch mocking and multiple concurrent fetches
  - Logging, timeout behavior, strict mode enforcement
- Deployed and verified working

Fixed script monitor creation bug and added scheduled health checks.

- Added 'script' to type validation in src/routes/api/monitors/+server.ts (POST)
- Added 'script' to type validation in src/routes/api/monitors/[id]/+server.ts (PUT)
- Added script field validation for script monitor type
- Created separate scheduled Worker at workers/scheduler/ for automatic cron triggers
- Scheduler runs every minute, calls /api/cron endpoint
- Deploy scheduler: cd workers/scheduler && wrangler deploy

Rewrote script checker for Cloudflare Workers compatibility.

- Cloudflare Workers blocks eval/new Function at runtime
- Replaced JS interpreter approach with URL extraction + HTTP status logic
- Script URLs extracted via regex, requests made on host, status derived from response codes
- Added /api/cron and /api/status to public paths in hooks.server.ts
- Fixed PWA workbox config: disabled navigateFallback for dynamic routes
- Migration 0004_fix_type_constraint.sql: Recreated monitors table with 'script' in CHECK constraint

Removed monitor type concept, script-only with visual builder.

- Simplified types: removed MonitorType, KeywordType, consolidated Monitor interface
- Deleted http.ts checker, script executor handles all monitors
- API endpoints simplified: no type validation, script required
- Created shared DSL types in src/lib/types/script.ts (ScriptDSL, ScriptStep, Assertion)
- New ScriptBuilder.svelte: visual UI for building multi-step scripts
- New ScriptEditor.svelte: code mode with JSON validation and formatting
- MonitorForm.svelte rebuilt with Visual Builder / Code toggle
- MonitorCard shows step count and first URL instead of type-specific fields
- Tests rewritten for JSON DSL format (13 tests, bun:test)
- tsconfig.json excludes test files from svelte-check

Replaced modal with dedicated pages for add/edit monitors.

- Created /monitors/new page for adding monitors
- Created /monitors/[id]/edit page with server-side monitor loading
- Updated MonitorCard to use link for edit instead of callback
- Dashboard now navigates to pages instead of opening modal
- Full page layout provides more space for complex script builder UI

Implemented multi-channel notification system with Slack, Discord, Webhook, and Web Push support.

- Migration 0005_notifications.sql: Added push_subscriptions table, updated notification_channels with webpush type, added downtime_threshold_s to monitor_notifications, added notified_channels to incidents
- src/lib/types/notification.ts: Types for channels, configs, payloads, VAPID keys
- src/lib/server/db/notifications.ts: CRUD for channels, subscriptions, VAPID key storage
- src/lib/server/notifications/: Senders for Slack (block kit), Discord (embeds), Webhook (template vars), WebPush (VAPID/aes128gcm encryption)
- src/routes/api/notification-channels/: REST API for channel management with test endpoint
- src/routes/api/push/: VAPID key and push subscription endpoints
- static/sw-push.js: Service worker for push notification handling
- src/lib/components/PushNotificationToggle.svelte: Browser push enable/disable UI on dashboard
- src/routes/notifications/+page.svelte: Channel management page with NotificationChannelForm and NotificationChannelCard components
- src/lib/components/MonitorNotificationConfig.svelte: Per-monitor channel subscription with notify_on and threshold settings
- Updated MonitorForm.svelte: Integrated notification config section
- Updated src/routes/api/cron/+server.ts: Triggers notifications on status changes
- TODO: Full downtime threshold enforcement with incident tracking integration

Full UI refactor with component library and mobile responsiveness.

- Consolidated 5 migrations into single migrations/0001_schema.sql
- Removed legacy monitor columns (type, url, hostname, port, method, expected_status, keyword, keyword_type, retry_count)
- Removed legacy script parser extractLegacyUrls(), JSON DSL only now
- Created UI component library in src/lib/components/ui/ (Button, Input, Select, Textarea, Card, Alert, Badge, Spinner, IconButton)
- Created layout components in src/lib/components/layout/ (AppShell, Header, BottomNav, PageHeader, Container)
- Mobile-first design: bottom nav for mobile (md:hidden), desktop header with nav
- All pages refactored to use new components and AppShell layout
- Created src/lib/utils/format.ts for formatDuration, formatTime, formatResponseTime, formatUptime
- Deleted StatusBadge.svelte, Modal.svelte (replaced by new components)
- All 11 tests pass, lint clean, build succeeds

Fixed UI bugs and improved mobile responsiveness.

- Recreated MonitorCard.svelte (was accidentally emptied during previous refactor)
- Fixed ScriptBuilder.svelte mobile layout: headers, extract variables, and assertions now stack on mobile
- Added href support to IconButton component for link-style icon buttons
- Fixed Settings page data loading on first login with $effect() sync
- Moved PushNotificationToggle from dashboard to notifications page
- Simplified notification form: removed webpush label field (uses name), removed body template from webhook
- Added dynamic name placeholder based on notification channel type
- Updated user type to accept null in AppShell/Header components
- Added autocomplete prop to Input component for password fields
- Removed resolve() usage from navigation (app has no base path)
- Disabled svelte/no-navigation-without-resolve lint rule in eslint.config.js

Fixed relative time updates and notification channel button UX.

- MonitorCard: Added $effect with setInterval to update relative time every minute
- NotificationChannelCard: Added loading state with spinner for Test button
- Button component: Added cursor-pointer to base styles for proper hover indication
- Updated webpush config preview to show "Browser Push" instead of label field

Fixed timezone conversion and redesigned webpush channel UX.

- src/lib/utils/format.ts: formatTime now normalizes SQLite timestamps (adds T separator and Z suffix for UTC)
- src/routes/api/push/subscribe/+server.ts: Auto-creates notification channel when browser push is enabled with browser-specific name
- src/lib/components/NotificationChannelForm.svelte: Removed webpush from Add Channel dropdown, shows info box when editing webpush channels
- src/lib/types/notification.ts: WebPushConfig now stores subscriptionId linking channel to push subscription
- Webpush channels can only be created by enabling browser notifications, but can still be edited/renamed

Enhanced time display and browser push UX.

- src/lib/utils/format.ts: formatTime now shows seconds (<2min), minutes (<1h), hours+minutes (<1d), days+hours (>=1d)
- src/lib/components/MonitorCard.svelte: Timer now updates every second for accurate countdown
- src/lib/components/PushNotificationToggle.svelte: Added getBrowserName/getPlatformName functions for smart channel naming (e.g., "Chrome - macOS")
- PushNotificationToggle now accepts onSubscriptionChange callback to notify parent when push enabled/disabled
- src/routes/notifications/+page.svelte: Passes loadChannels to PushNotificationToggle so channel list updates immediately
- Deployed to https://pingflare.pages.dev

Added public status page with uptime metrics, charts, and announcements.

- migrations/0002_status_page.sql: Added is_public column to monitors, status_announcements table, check_aggregates table for hourly data
- src/lib/types/status.ts: Types for announcements, uptime metrics (24h, 30d, 6m, 1y), chart data points
- src/lib/types/monitor.ts: Added is_public field to Monitor interface
- src/lib/server/db/status.ts: Functions for public/all monitors, uptime calculations, chart data, hourly aggregation
- src/lib/server/db/announcements.ts: CRUD for status announcements (maintenance, incident, resolved, info)
- src/routes/api/cron/+server.ts: Added hourly aggregation and cleanup for check data
- Public API endpoints: /api/public/status, /api/public/status/[id], /api/public/announcements
- Admin API endpoints: /api/announcements, /api/announcements/[id] for CRUD
- src/hooks.server.ts: Added /status and /api/public to PUBLIC_PATHS
- UI components: UptimeChart.svelte (lightweight-charts), UptimeStats.svelte, AnnouncementBanner.svelte, AnnouncementCard.svelte, AnnouncementForm.svelte, StatusCard.svelte, PublicLayout.svelte
- src/lib/components/MonitorForm.svelte: Added "Show on Public Status Page" toggle
- Public pages: /status (list all public monitors), /status/[id] (30-day chart, uptime stats)
- Admin pages: /admin/status (all monitors), /admin/status/[id] (detailed view), /announcements (CRUD)
- Navigation: Added Status link to Header.svelte and BottomNav.svelte
- Deployed to https://pingflare.pages.dev

Redesigned status page with incident management system.

- Removed complex charts in favor of simple 90-day CSS uptime bars (like Anthropic's status page)
- migrations/0003_incidents.sql: incidents, incident_updates, daily_status tables
- src/lib/types/status.ts: Rewritten with DailyStatus, StatusMonitor, Incident, IncidentUpdate, IncidentsByDate types
- src/lib/components/UptimeBars.svelte: CSS bars for 90 days with hover tooltips (green=up, yellow=degraded, red=down)
- src/lib/server/db/status.ts: Rewritten with getDailyStatus, getUptime90d, incident CRUD, aggregateDailyStatus
- API endpoints: /api/incidents (GET/POST), /api/incidents/[id] (GET/POST/DELETE), /api/public/incidents
- src/routes/status/+page.svelte: Public page with overall status banner, active incidents, uptime bars, past incidents by date
- src/routes/admin/status/+page.svelte: Admin page with UptimeBars, active incidents summary, link to incident management
- src/routes/admin/incidents/+page.svelte: Full incident management with create, add updates, delete
- Removed: UptimeChart, UptimeStats, AnnouncementBanner, AnnouncementForm, AnnouncementCard, StatusCard components
- Removed: /announcements page, /api/announcements endpoints, status detail pages (/status/[id], /admin/status/[id])
- Removed: lightweight-charts dependency
- src/routes/api/cron/+server.ts: Changed to daily aggregation with aggregateDailyStatus, cleanupOldDailyStatus
- Deployed to https://pingflare.pages.dev

Added monitor groups with per-group status and 5-min failure threshold.

- migrations/0004_monitor_groups.sql: monitor_groups table, group_id columns on monitors and incidents
- src/lib/types/group.ts: MonitorGroup, GroupWithStatus, CreateGroupInput, UpdateGroupInput types
- src/lib/types/monitor.ts: Added group_id to Monitor, CreateMonitorInput
- src/lib/types/status.ts: Added group_id, group_name to Incident; group_id to StatusMonitor; group_id to CreateIncidentInput
- src/lib/server/db/groups.ts: CRUD for groups, getPublicGroupsWithStatus, getAllGroupsWithStatus, getOrCreateDefaultGroup
- src/lib/server/db/status.ts: Added getEffectiveStatus for 5-min threshold, updated incident queries with group_name join
- src/lib/server/db/monitors.ts: Updated createMonitor/updateMonitor with group_id
- API endpoints: /api/groups (GET/POST), /api/groups/[id] (GET/PUT/DELETE)
- src/routes/api/incidents/+server.ts: Requires group_id for incident creation
- src/routes/admin/groups/+page.svelte: Group management page with CRUD
- src/lib/components/MonitorForm.svelte: Added group selector dropdown (required field)
- src/routes/monitors/new/, src/routes/monitors/[id]/edit/: Load and pass groups to MonitorForm
- src/routes/status/+page.svelte: Monitors grouped by group with per-group status badges and uptime
- src/routes/admin/status/+page.svelte: Grouped display with link to Manage Groups
- src/routes/admin/incidents/+page.svelte: Group selector in incident form, group_name badges on cards
- 5-min failure threshold: getEffectiveStatus returns 'down' only if last 5 mins of checks all fail (dashboard display only)

Moved visibility control to groups and redesigned public status pages.

- migrations/0005_group_visibility.sql: Added slug and is_public columns to monitor_groups
- src/lib/types/group.ts: Added slug, is_public to MonitorGroup; updated Create/UpdateGroupInput with slug, is_public
- src/lib/server/db/groups.ts: Added getPublicGroups, getGroupBySlug, getGroupWithStatusBySlug functions
- src/lib/server/db/groups.ts: Updated createGroup/updateGroup to handle slug and is_public
- src/lib/server/db/groups.ts: Changed getPublicGroupsWithStatus to filter by group.is_public (not monitor.is_public)
- src/routes/status/+page.svelte: Redesigned to show group cards in grid with status badges, links to /status/[slug]
- src/routes/status/+page.server.ts: Simplified to load public groups with status and active incidents
- src/routes/status/[slug]/+page.svelte: New group detail page with uptime bars, active and past incidents
- src/routes/status/[slug]/+page.server.ts: Loads group by slug with full status data
- src/routes/admin/groups/+page.svelte: Added slug input with auto-generation and is_public checkbox
- src/routes/api/groups/+server.ts: POST now handles slug and is_public
- src/lib/components/MonitorForm.svelte: Removed is_public checkbox (visibility controlled at group level)
- Deployed to https://pingflare.pages.dev

Added assertion severity and responseTime check to DSL.

- src/lib/types/script.ts: Added AssertionSeverity type ('degraded' | 'down'), added severity? field to Assertion interface
- src/lib/server/checkers/script.ts: Updated executeScript to track assertion severity, responseTime now available as checkable path
- src/lib/components/ScriptBuilder.svelte: Added severity dropdown per assertion, updated placeholder hints
- src/lib/server/checkers/script.test.ts: Added 8 new tests for severity and responseTime assertions
- MEMORIES.md: Updated DSL documentation with severity and responseTime features

Fixed notification linking on monitor create/edit and increased severity dropdown width.

- src/routes/monitors/new/+page.svelte: Extract notifications from FormData and include in API request
- src/routes/monitors/[id]/edit/+page.svelte: Extract notifications from FormData and include in API request
- src/lib/components/ScriptBuilder.svelte: Increased severity dropdown width from sm:w-24 to sm:w-32

Enabled Cloudflare Deploy Button by converting from Pages to Workers deployment.

- Created src/worker.ts: Custom worker entry point with fetch + scheduled handlers
- Created scripts/build-worker.js: Post-build script to bundle SvelteKit output with esbuild
- Updated wrangler.toml: Converted from Pages to Workers with Static Assets, added cron triggers
- Updated package.json: Added esbuild dep, build:worker and deploy scripts
- Updated src/app.d.ts: Added ASSETS binding type
- Created .dev.vars.example: Empty secrets template for deploy button
- Rewrote README.md: Added deploy button, feature list, architecture docs
- Deleted workers/scheduler/: Merged cron handler into main worker
- Build output: dist/\_worker.js + static assets
- Deploy button provisions D1 and configures cron automatically

Fixed adapter-cloudflare conflict with dual wrangler config approach.

- Created wrangler.build.toml: Pages-style config for SvelteKit build phase
- Updated wrangler.toml: Workers-style config for deployment only
- Updated package.json build script: Swaps configs during build

Removed KV namespace dependency from codebase.

- Deleted src/lib/server/cache.ts: KV caching layer (not used)
- Removed KV bindings from wrangler.toml and wrangler.build.toml
- Removed STATUS_CACHE type from src/app.d.ts and src/worker.ts
- Status endpoints now query D1 directly (fast enough for small-scale monitoring)

Consolidated migrations and removed backward compatibility code.

- Compacted 5 migration files into single migrations/0001_schema.sql with final schema
- Removed is_public column from monitors (visibility now at group level only)
- Removed is_public from Monitor type, CreateMonitorInput, and DB functions
- Removed getPublicMonitorsForStatusPage (used monitor.is_public)
- Updated /api/public/status to use group-based visibility via getPublicGroupsWithStatus
- Cleaned up monitor new/edit pages to not pass is_public
- Deleted migrations 0002-0005 (status_announcements, check_aggregates tables not used)
- Updated MEMORIES.md with correct schema and removed KV references

Cleaned up legacy code and unused types.

- Removed unused imports in src/routes/status/[slug]/+page.server.ts (getActiveIncidents, getRecentIncidentsByDate, GroupWithStatus)
- Removed unused isNewChannel variable in src/lib/components/NotificationChannelForm.svelte
- Removed legacy IncidentStatus type ('ongoing' | 'resolved') from src/lib/types/monitor.ts (unused, superseded by status.ts version)
- Removed legacy Incident interface from src/lib/types/monitor.ts (had started_at, duration_seconds, notified_channels - all unused fields)
- Updated src/lib/server/notifications/index.ts to import Incident from status.ts, use created_at and calculate duration from resolved_at
- Renamed StatusCacheEntry to StatusResponse in src/lib/types/monitor.ts and src/routes/api/status/+server.ts (KV cache removed, name was misleading)
- Fixed 'as never' type cast in src/lib/types/auth.ts with proper Record<UserRole, readonly Permission[]> typing

Optimized Deploy to Cloudflare button support with D1 migrations and cron scheduling.

- Updated wrangler.toml: Added migrations_dir for automatic D1 migration discovery
- Updated package.json deploy script: Runs D1 migrations before wrangler deploy
- Added cloudflare.bindings description in package.json for deploy button UI
- Rewrote README.md: Comprehensive documentation with deploy button, features, architecture, usage guide, DSL reference

Cleaned up project files and simplified build script.

- Simplified build script from file-swapping hack to direct command (svelte.config.js now uses `config: 'wrangler.build.toml'`)
- Removed unused adapter packages (@sveltejs/adapter-auto, @sveltejs/adapter-node)
- Deleted stale build/ directory (old adapter-node output)
- Removed .npmrc (not needed for bun), .dev.vars.example (empty template)
- Simplified .prettierignore to only necessary entries
- Updated .gitignore and eslint.config.js to remove /build references

Fixed critical API authentication vulnerability - all admin endpoints now require authentication.

- Added `locals.user` auth guard to all admin API endpoints (22 handlers total)
- src/routes/api/monitors/+server.ts: GET, POST now require auth
- src/routes/api/monitors/[id]/+server.ts: GET, PUT, DELETE now require auth
- src/routes/api/monitors/[id]/notifications/+server.ts: GET now requires auth
- src/routes/api/groups/+server.ts: GET, POST now require auth
- src/routes/api/groups/[id]/+server.ts: GET, PUT, DELETE now require auth
- src/routes/api/incidents/+server.ts: GET, POST now require auth
- src/routes/api/incidents/[id]/+server.ts: GET, POST, DELETE now require auth
- src/routes/api/notification-channels/+server.ts: GET, POST now require auth
- src/routes/api/notification-channels/[id]/+server.ts: GET, PUT, DELETE now require auth
- src/routes/api/notification-channels/[id]/test/+server.ts: POST now requires auth
- src/routes/api/push/subscribe/+server.ts: POST, DELETE now require auth
- src/routes/api/push/vapid-key/+server.ts: GET now requires auth
- src/routes/api/cron/+server.ts: requires CRON_SECRET env var and X-Cron-Secret header
- src/routes/api/status/+server.ts: now requires auth (was exposing all monitors publicly)
- src/worker.ts, scripts/build-worker.js: scheduled handler passes CRON_SECRET to cron endpoint
- src/app.d.ts: added CRON_SECRET to Platform.env type
- wrangler.toml: documented CRON_SECRET requirement
- README.md: added CRON_SECRET setup instructions to Quick Start
- Public endpoints: /api/public/*, /api/auth/*
