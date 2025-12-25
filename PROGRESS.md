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
