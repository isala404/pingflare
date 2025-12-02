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
- Current state: Fresh SvelteKit scaffold with adapter-node (will change to adapter-cloudflare)

Target Cloudflare Products

- Workers: Core monitoring logic, cron triggers for scheduled checks
- D1: SQLite database for monitor configs, check history, incidents
- Durable Objects: Real-time state management, WebSocket connections for live updates
- KV: Caching current status, fast reads for status pages
- Queues: Async notification processing
- Pages: SvelteKit frontend hosting

Architectural Notes

- Cron triggers max 25 monitors with Slack due to 50 subrequest limit per invocation
- Durable Objects have built-in SQLite storage (zero-latency)
- Workers can make outbound TCP connections via connect() API from cloudflare:sockets
- Free tier: 100k requests/day, 10ms CPU/request, 1GB KV storage

User Preferences

- Never include "Claude" or "Claude Code" or co author tags in any git commit messages.
