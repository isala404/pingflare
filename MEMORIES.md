Tooling

- Stack: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4
- Package manager: bun
- Test command: (not configured yet)
- Lint command: bun lint
- Format command: bun format
- Check command: bun check
- PWA support: @vite-pwa/sveltekit

Project Context

- Name: pingflare - Cloudflare-native uptime monitoring solution
- Goal: Monitor ~30 services on Hetzner dedicated server from external Cloudflare infrastructure
- Inspiration: Uptime Kuma but serverless on Cloudflare ecosystem
- Deployed at: https://pingflare.pages.dev
- Current state: MVP complete with HTTP monitoring, dashboard, KV caching

Cloudflare Resources

- D1 Database: pingflare-db (74b11544-7a08-46b5-851c-8ec5ef153e70)
- KV Namespace: STATUS_CACHE (bcb87ba93beb493bad285feff7362a2e)
- Pages Project: pingflare

API Endpoints

- GET/POST /api/monitors - List/create monitors
- GET/PUT/DELETE /api/monitors/[id] - Single monitor CRUD
- GET /api/cron - Trigger health checks (manual or cron)
- GET /api/status - Fast status from KV cache

Future Cloudflare Products

- Durable Objects: Real-time WebSocket for live updates (Phase 2)
- Queues: Async notification processing (Phase 2)
- Cron Triggers: Automated scheduled checks (needs configuration in dashboard)

Architectural Notes

- Cron triggers max 25 monitors with Slack due to 50 subrequest limit per invocation
- Durable Objects have built-in SQLite storage (zero-latency)
- Workers can make outbound TCP connections via connect() API from cloudflare:sockets
- Free tier: 100k requests/day, 10ms CPU/request, 1GB KV storage

User Preferences

- Never include "Claude" or "Claude Code" or co author tags in any git commit messages.
