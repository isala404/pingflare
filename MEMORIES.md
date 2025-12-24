Tooling

- Stack: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4
- Package manager: bun
- Test command: bun test (vitest)
- Lint command: bun lint
- Format command: bun format
- Check command: bun check
- PWA support: @vite-pwa/sveltekit

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

API Endpoints

- GET/POST /api/monitors - List/create monitors
- GET/PUT/DELETE /api/monitors/[id] - Single monitor CRUD
- GET /api/cron - Trigger health checks (manual or cron)
- GET /api/status - Fast status from KV cache
- GET /api/auth/status - Check setup state and current user
- POST /api/auth/setup - Create initial admin (name, email, password)
- POST /api/auth/login - Email/password authentication
- POST /api/auth/logout - Delete session
- PUT /api/auth/profile - Update user name
- PUT /api/auth/password - Change password

Authentication

- Session-based auth with cookies (7-day expiry)
- SHA-256 password hashing via Web Crypto API
- User fields: name, email (login), password
- Role-based permissions: admin/editor/viewer
- First visit redirects to /setup, subsequent visits to /login
- Protected routes: all except /login, /setup, /api/auth/\*
- Settings page at /settings for profile and password management

Script Checker

- Monitor type 'script' for custom JavaScript health checks
- Scripts execute in sandboxed Function constructor with strict mode
- Context object provides: fetch (with timeout), log (debug capture)
- Scripts must define check(ctx) returning {status, message?, responseTime?, statusCode?}
- Timeout enforced via Promise.race
- Example use cases: multi-endpoint checks, JSON response validation, conditional logic

Scheduler Worker

- Separate Cloudflare Worker at workers/scheduler/
- Triggers /api/cron every minute via cron trigger
- Deploy: cd workers/scheduler && wrangler deploy
- Has /trigger endpoint for manual testing

Future Cloudflare Products

- Durable Objects: Real-time WebSocket for live updates (Phase 2)
- Queues: Async notification processing (Phase 2)

Architectural Notes

- Cron triggers max 25 monitors with Slack due to 50 subrequest limit per invocation
- Durable Objects have built-in SQLite storage (zero-latency)
- Workers can make outbound TCP connections via connect() API from cloudflare:sockets
- Free tier: 100k requests/day, 10ms CPU/request, 1GB KV storage

User Preferences

- Never include "Claude" or "Claude Code" or co author tags in any git commit messages.
